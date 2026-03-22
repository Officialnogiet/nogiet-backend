import { EmissionRepository } from "../repositories/emission.repository";
import { UserRepository } from "../repositories/user.repository";
import { CarbonMapperService, bboxCacheKey, NIGERIA_BBOX, isInsideBBox } from "./third-party/carbon-mapper.service";
import type { BBox } from "./third-party/carbon-mapper.service";
import type { CarbonMapperSource } from "../types/index";
import { CacheService } from "./cache.service";
import { NotificationService } from "./notification.service";
import { EmailService } from "./email/email.service";
import type { SubmitGroundDataInput, EmissionFilterInput, CreateFacilityInput, CreateAlertInput } from "../validations/emission.validation";
import type { Server as SocketIOServer } from "socket.io";

const ONE_DAY_SEC = 24 * 60 * 60; // 86400

export class EmissionService {
  private io: SocketIOServer | null = null;
  private fetchPromise: Promise<CarbonMapperSource[]> | null = null;
  private notificationService: NotificationService;

  constructor(
    private emissionRepo: EmissionRepository,
    private carbonMapper: CarbonMapperService,
    private cache: CacheService,
    emailService?: EmailService,
    userRepo?: UserRepository,
  ) {
    this.notificationService = new NotificationService(emissionRepo, emailService, userRepo);
  }

  setAlertThreshold(minRate: number) {
    this.notificationService.setThreshold(minRate);
  }

  setEmailAlertsEnabled(enabled: boolean) {
    this.notificationService.setEmailAlertsEnabled(enabled);
  }

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  // ---- Facilities ----

  async getFacilities() {
    return this.emissionRepo.findAllFacilities();
  }

  async getFacilityById(id: string) {
    const facility = await this.emissionRepo.findFacilityById(id);
    if (!facility) {
      throw Object.assign(new Error("Facility not found"), { statusCode: 404 });
    }
    return facility;
  }

  async createFacility(input: CreateFacilityInput) {
    return this.emissionRepo.createFacility(input);
  }

  async deleteFacility(id: string) {
    const facility = await this.emissionRepo.findFacilityById(id);
    if (!facility) {
      throw Object.assign(new Error("Facility not found"), { statusCode: 404 });
    }
    return this.emissionRepo.deleteFacility(id);
  }

  // ---- Ground Data ----

  async submitGroundData(userId: string, input: SubmitGroundDataInput) {
    const facility = await this.emissionRepo.findFacilityById(input.facilityId);
    if (!facility) {
      throw Object.assign(new Error("Facility not found"), { statusCode: 404 });
    }
    return this.emissionRepo.submitGroundData({
      facilityId: input.facilityId,
      submittedBy: userId,
      measurementDate: new Date(input.measurementDate),
      methaneReading: input.methaneReading,
      methodology: input.methodology,
      latitude: input.latitude ?? facility.latitude,
      longitude: input.longitude ?? facility.longitude,
    });
  }

  async getGroundData(facilityId: string, startDate?: string, endDate?: string) {
    return this.emissionRepo.getGroundDataByFacility(
      facilityId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  // ---- Alerts ----

  async createAlert(input: CreateAlertInput) {
    if (input.facilityId) {
      const facility = await this.emissionRepo.findFacilityById(input.facilityId);
      if (!facility) {
        throw Object.assign(new Error("Facility not found"), { statusCode: 404 });
      }
    }
    return this.emissionRepo.createAlert(input);
  }

  async getAlerts(limit = 20) {
    await this.purgeOldAlerts();
    return this.emissionRepo.getAlerts(limit);
  }

  async markAllAlertsRead() {
    return this.emissionRepo.markAllAlertsRead();
  }

  async getUnreadAlertCount() {
    return this.emissionRepo.getUnreadAlertCount();
  }

  private async purgeOldAlerts() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      const deleted = await this.emissionRepo.deleteOldAlerts(cutoff);
      if (deleted.length > 0) {
        console.log(`[Alerts] purged ${deleted.length} alerts older than 24h`);
      }
    } catch (err: any) {
      console.warn("[Alerts] purge failed:", err.message);
    }
  }

  async getEmissionStats() {
    return this.emissionRepo.getEmissionStats();
  }

  // ---- Satellite Sources (Redis 24h -> CarbonMapper API) ----

  /**
   * CarbonMapper's /sources.geojson returns ALL global sources (~10K).
   * We cache the full global set in Redis (24h), then filter server-side
   * to the requested viewport bbox (defaults to Nigeria).
   *
   * Request deduplication: if a fetch is already in flight, subsequent
   * callers await the same promise instead of firing duplicate requests.
   */
  async getSatelliteSources(filters: EmissionFilterInput) {
    if (!this.carbonMapper.isConfigured) {
      return { features: [], total: 0, source: "none" as const, error: "CarbonMapper credentials not configured" };
    }

    const gasType = filters.gasType ?? "CH4";
    const cacheKey = bboxCacheKey(gasType);
    const viewportBBox = this.parseBBoxStr(filters.bbox);

    try {
      const allSources = await this.getAllSourcesCached(gasType, cacheKey, filters);
      const filtered = allSources.filter(s => isInsideBBox(s.lat, s.lon, viewportBBox));

      return {
        features: filtered,
        total: filtered.length,
        globalTotal: allSources.length,
        source: "cache" as const,
      };
    } catch (err: any) {
      console.error("[Satellite] failed to fetch sources:", err.message);
      return {
        features: [],
        total: 0,
        source: "error" as const,
        error: `Satellite data unavailable: ${err.message}`,
      };
    }
  }

  /**
   * Manual refresh: user clicks "Refresh Region".
   * Invalidates cache, fetches fresh from CarbonMapper,
   * then pushes filtered results via Socket.IO.
   */
  async refreshSatelliteRegion(filters: EmissionFilterInput) {
    if (!this.carbonMapper.isConfigured) {
      return { features: [], total: 0, source: "none" as const, error: "CarbonMapper credentials not configured" };
    }

    const gasType = filters.gasType ?? "CH4";
    const cacheKey = bboxCacheKey(gasType);
    const viewportBBox = this.parseBBoxStr(filters.bbox);

    try {
      await this.cache.del(cacheKey);

      const allSources = await this.fetchAndCache(gasType, cacheKey, filters);
      const filtered = allSources.filter(s => isInsideBBox(s.lat, s.lon, viewportBBox));

      if (this.io) {
        this.io.emit("satellite:update", {
          features: filtered,
          total: filtered.length,
          bbox: filters.bbox ?? null,
        });
      }

      return { features: filtered, total: filtered.length, source: "api" as const };
    } catch (err: any) {
      console.error("[Satellite] refresh failed:", err.message);
      return {
        features: [],
        total: 0,
        source: "error" as const,
        error: `Satellite data unavailable: ${err.message}`,
      };
    }
  }

  /**
   * Get all sources from cache, or fetch + cache if missing.
   * Uses request deduplication to avoid parallel CarbonMapper calls.
   */
  private async getAllSourcesCached(
    gasType: string,
    cacheKey: string,
    filters: Partial<EmissionFilterInput>
  ): Promise<CarbonMapperSource[]> {
    const cached = await this.cache.get<CarbonMapperSource[]>(cacheKey);
    if (cached) return cached;

    return this.fetchAndCache(gasType, cacheKey, filters);
  }

  /**
   * Fetches from CarbonMapper with request deduplication.
   * Only one in-flight request at a time; concurrent callers share the result.
   */
  private async fetchAndCache(
    gasType: string,
    cacheKey: string,
    filters: Partial<EmissionFilterInput>
  ): Promise<CarbonMapperSource[]> {
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this.carbonMapper
      .fetchAllSources({ ...filters, gasType: gasType as "CH4" | "CO2" })
      .then(async (sources) => {
        await this.cache.set(cacheKey, sources, ONE_DAY_SEC);

        const nigeriaSources = sources.filter(s => isInsideBBox(s.lat, s.lon, NIGERIA_BBOX));
        this.notificationService
          .evaluateSatelliteSources(nigeriaSources, this.io)
          .catch(err => console.warn("[NotificationService] alert evaluation failed:", err.message));

        return sources;
      })
      .finally(() => {
        this.fetchPromise = null;
      });

    return this.fetchPromise;
  }

  /**
   * Parse a bbox string into a BBox object.
   * Returns exactly what the client sends — the viewport they're viewing.
   * Defaults to Nigeria only when no bbox is provided (initial load).
   */
  private parseBBoxStr(s?: string): BBox {
    if (!s) return NIGERIA_BBOX;
    const parts = s.split(",").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return NIGERIA_BBOX;

    const [minLon, minLat, maxLon, maxLat] = parts;
    if (minLon >= maxLon || minLat >= maxLat) return NIGERIA_BBOX;

    return { minLon, minLat, maxLon, maxLat };
  }

  // ---- Satellite plumes ----

  async getSatellitePlumes(sourceId: string) {
    if (!this.carbonMapper.isConfigured) {
      return [];
    }
    try {
      return await this.carbonMapper.getPlumes(sourceId);
    } catch (err: any) {
      console.error("[Satellite] failed to fetch plumes for", sourceId, err.message);
      return [];
    }
  }

  // ---- Comparison ----

  async getComparisonData(
    facilityId: string,
    startDate?: string,
    endDate?: string,
    mode: "nearest" | "area" = "nearest",
    maxDistanceKm?: number,
  ) {
    const groundData = await this.getGroundData(facilityId, startDate, endDate);
    const facility = await this.getFacilityById(facilityId);

    let allNearbySources: (CarbonMapperSource & { distanceKm: number })[] = [];
    let satelliteData: (CarbonMapperSource & { distanceKm: number })[] = [];
    let comparisonMeta = { mode, radiusKm: 0, matchCount: 0, maxSearchKm: maxDistanceKm ?? 300 };

    if (this.carbonMapper.isConfigured) {
      try {
        const cacheKey = bboxCacheKey("CH4");
        const allSources = await this.getAllSourcesCached("CH4", cacheKey, {});
        const nigeriaSources = allSources.filter(s => isInsideBBox(s.lat, s.lon, NIGERIA_BBOX));

        const withDist = nigeriaSources.map(s => ({
          ...s,
          distanceKm: Math.round(
            Math.sqrt(
              Math.pow((s.lat - facility.latitude) * 111, 2) +
              Math.pow((s.lon - facility.longitude) * 111 * Math.cos(facility.latitude * Math.PI / 180), 2)
            )
          ),
        })).sort((a, b) => a.distanceKm - b.distanceKm);

        const searchRadius = maxDistanceKm ?? 300;
        allNearbySources = withDist.filter(s => s.distanceKm <= searchRadius);

        if (mode === "nearest") {
          satelliteData = allNearbySources.slice(0, 1);
          comparisonMeta.radiusKm = satelliteData[0]?.distanceKm ?? 0;
          comparisonMeta.matchCount = 1;
        } else {
          satelliteData = allNearbySources;
          comparisonMeta.radiusKm = searchRadius;
          comparisonMeta.matchCount = allNearbySources.length;
        }
      } catch {
        // CarbonMapper might be unavailable
      }
    }

    return {
      groundData,
      satelliteData,
      allNearbySources,
      facility,
      comparisonMeta,
    };
  }
}
