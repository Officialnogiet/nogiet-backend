import { EmissionRepository } from "../repositories/emission.repository";
import type { FacilityFilters } from "../repositories/emission.repository";
import { UserRepository } from "../repositories/user.repository";
import { CarbonMapperService, bboxCacheKey, NIGERIA_BBOX, isInsideBBox } from "./third-party/carbon-mapper.service";
import type { BBox } from "./third-party/carbon-mapper.service";
import { SatelliteAggregatorService } from "./third-party/satellite-aggregator.service";
import type { CarbonMapperSource, NormalizedSource, SatelliteProvider } from "../types/index";
import { CacheService } from "./cache.service";
import { NotificationService } from "./notification.service";
import { EmailService } from "./email/email.service";
import type {
  SubmitGroundDataInput,
  EmissionFilterInput,
  CreateFacilityInput,
  CreateAlertInput,
  UpdateFacilityThresholdInput,
  CreateGeofenceInput,
  UpdateGeofenceInput,
  CreateFieldSubmissionInput,
  ReviewFieldSubmissionInput,
} from "../validations/emission.validation";
import type { Server as SocketIOServer } from "socket.io";

const ONE_DAY_SEC = 24 * 60 * 60;

export class EmissionService {
  private io: SocketIOServer | null = null;
  private fetchPromise: Promise<CarbonMapperSource[]> | null = null;
  private notificationService: NotificationService;

  constructor(
    private emissionRepo: EmissionRepository,
    private carbonMapper: CarbonMapperService,
    private cache: CacheService,
    private aggregator: SatelliteAggregatorService,
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

  async getFacilities(filters?: FacilityFilters) {
    return this.emissionRepo.findAllFacilities(filters);
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

  async updateFacilityThreshold(id: string, input: UpdateFacilityThresholdInput) {
    const facility = await this.emissionRepo.findFacilityById(id);
    if (!facility) {
      throw Object.assign(new Error("Facility not found"), { statusCode: 404 });
    }
    return this.emissionRepo.updateFacilityThreshold(id, input.alertThreshold);
  }

  async getFacilityFilterOptions() {
    return this.emissionRepo.getDistinctFacilityValues();
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

  // ---- Satellite Sources (Aggregated from all providers) ----

  async getSatelliteSources(filters: EmissionFilterInput) {
    const viewportBBox = this.parseBBoxStr(filters.bbox);
    const provider = filters.provider as SatelliteProvider | undefined;

    try {
      const sources = await this.aggregator.fetchAllSources(viewportBBox, provider, filters.gasType);
      return {
        features: sources,
        total: sources.length,
        providers: this.aggregator.configuredProviders,
        source: "cache" as const,
      };
    } catch (err: any) {
      console.error("[Satellite] aggregator fetch failed:", err.message);
      return {
        features: [],
        total: 0,
        providers: this.aggregator.configuredProviders,
        source: "error" as const,
        error: `Satellite data unavailable: ${err.message}`,
      };
    }
  }

  async refreshSatelliteRegion(filters: EmissionFilterInput) {
    const viewportBBox = this.parseBBoxStr(filters.bbox);
    const provider = filters.provider as SatelliteProvider | undefined;

    try {
      const sources = await this.aggregator.refreshAllSources(viewportBBox, provider, filters.gasType);

      // Also evaluate via legacy CarbonMapper path for alert generation
      if (this.carbonMapper.isConfigured) {
        const cmSources = sources
          .filter(s => s.provider === "carbon_mapper")
          .map(s => ({
            source_name: s.name,
            lat: s.latitude,
            lon: s.longitude,
            sector: s.sector,
            gas: s.gas,
            emission_rate: s.emissionRate,
            persistence: s.persistence,
            plume_count: s.plumeCount,
            instrument: s.instrument,
            first_detected: s.firstDetected,
            last_detected: s.lastDetected,
          }));
        const nigeriaSources = cmSources.filter(s => isInsideBBox(s.lat, s.lon, NIGERIA_BBOX));
        this.notificationService
          .evaluateSatelliteSources(nigeriaSources, this.io)
          .catch(err => console.warn("[NotificationService] alert evaluation failed:", err.message));
      }

      // Check geofences for all sources
      this.checkGeofences(sources).catch(err =>
        console.warn("[Geofence] check failed:", err.message)
      );

      if (this.io) {
        this.io.emit("satellite:update", {
          features: sources,
          total: sources.length,
          bbox: filters.bbox ?? null,
        });
      }

      return { features: sources, total: sources.length, source: "api" as const };
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

  private async getAllSourcesCached(
    gasType: string,
    cacheKey: string,
    filters: Partial<EmissionFilterInput>
  ): Promise<CarbonMapperSource[]> {
    const cached = await this.cache.get<CarbonMapperSource[]>(cacheKey);
    if (cached) return cached;

    return this.fetchAndCache(gasType, cacheKey, filters);
  }

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
        return sources;
      })
      .finally(() => {
        this.fetchPromise = null;
      });

    return this.fetchPromise;
  }

  // ---- Geofences ----

  async getGeofences(userId?: string) {
    return this.emissionRepo.findAllGeofences(userId);
  }

  async createGeofence(userId: string, input: CreateGeofenceInput) {
    return this.emissionRepo.createGeofence({
      userId,
      name: input.name,
      geometry: input.geometry,
      alertEnabled: input.alertEnabled ?? true,
      threshold: input.threshold,
    });
  }

  async updateGeofence(id: string, userId: string, input: UpdateGeofenceInput) {
    const gf = await this.emissionRepo.findGeofenceById(id);
    if (!gf) throw Object.assign(new Error("Geofence not found"), { statusCode: 404 });
    if (gf.userId !== userId) throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    return this.emissionRepo.updateGeofence(id, input);
  }

  async deleteGeofence(id: string, userId: string) {
    const gf = await this.emissionRepo.findGeofenceById(id);
    if (!gf) throw Object.assign(new Error("Geofence not found"), { statusCode: 404 });
    if (gf.userId !== userId) throw Object.assign(new Error("Not authorized"), { statusCode: 403 });
    return this.emissionRepo.deleteGeofence(id);
  }

  async checkGeofences(sources: NormalizedSource[]) {
    const enabledGeofences = await this.emissionRepo.findEnabledGeofences();
    for (const gf of enabledGeofences) {
      const geometry = gf.geometry as any;
      if (!geometry || !geometry.coordinates) continue;

      for (const src of sources) {
        const threshold = gf.threshold ?? 20;
        if (src.emissionRate < threshold) continue;

        if (this.pointInGeofence(src.latitude, src.longitude, geometry)) {
          const existing = await this.emissionRepo.findAlertBySourceName(`geofence-${gf.id}-${src.id}`);
          if (existing) continue;

          const alert = await this.emissionRepo.createSatelliteAlert({
            sourceName: `geofence-${gf.id}-${src.id}`,
            title: `Geofence alert: ${gf.name}`,
            description: `Emission of ${src.emissionRate.toFixed(1)} kg/hr detected inside geofence "${gf.name}" from ${src.provider}.`,
            emissionRate: src.emissionRate,
            severity: src.emissionRate >= 100 ? "critical" : src.emissionRate >= 50 ? "high" : "medium",
          });

          if (this.io) {
            this.io.emit("alert:new", alert);
          }
        }
      }
    }
  }

  private pointInGeofence(lat: number, lon: number, geometry: any): boolean {
    if (geometry.type === "Polygon") {
      return this.pointInPolygon(lon, lat, geometry.coordinates[0]);
    }
    if (geometry.type === "Circle" && geometry.center && geometry.radius) {
      const [cx, cy] = geometry.center;
      const dist = Math.sqrt(
        Math.pow((lat - cy) * 111, 2) +
        Math.pow((lon - cx) * 111 * Math.cos(cy * Math.PI / 180), 2)
      );
      return dist <= geometry.radius;
    }
    return false;
  }

  private pointInPolygon(x: number, y: number, polygon: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // ---- Field Submissions ----

  async createFieldSubmission(userId: string, input: CreateFieldSubmissionInput) {
    const facility = await this.emissionRepo.findFacilityById(input.facilityId);
    if (!facility) throw Object.assign(new Error("Facility not found"), { statusCode: 404 });
    return this.emissionRepo.createFieldSubmission({
      ...input,
      submittedBy: userId,
    });
  }

  async getFieldSubmissions(facilityId?: string) {
    return this.emissionRepo.findFieldSubmissions(facilityId);
  }

  async reviewFieldSubmission(id: string, input: ReviewFieldSubmissionInput) {
    const sub = await this.emissionRepo.findFieldSubmissionById(id);
    if (!sub) throw Object.assign(new Error("Submission not found"), { statusCode: 404 });
    return this.emissionRepo.updateFieldSubmissionStatus(id, input.status);
  }

  // ---- Dashboard ----

  async getDashboardSummary() {
    const dbSummary = await this.emissionRepo.getDashboardSummary();

    let activeSatelliteSources = 0;
    let totalSatelliteEmissionRate = 0;
    try {
      const satData = await this.aggregator.fetchAllSources(NIGERIA_BBOX);
      activeSatelliteSources = satData.length;
      totalSatelliteEmissionRate = satData.reduce((sum, s) => sum + s.emissionRate, 0);
    } catch {
      // satellite data may be unavailable
    }

    return {
      ...dbSummary,
      activeSatelliteSources,
      totalSatelliteEmissionRate: Math.round(totalSatelliteEmissionRate * 100) / 100,
      providers: this.aggregator.configuredProviders,
    };
  }

  async getEmissionAggregations() {
    return this.emissionRepo.getEmissionAggregations();
  }
}
