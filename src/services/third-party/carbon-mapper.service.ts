import { env } from "../../config/env";
import type {
  CarbonMapperTokens,
  CarbonMapperSource,
  CarbonMapperPlume,
} from "../../types/index";
import type { EmissionFilterInput } from "../../validations/emission.validation";

export const NIGERIA_BBOX = {
  minLon: 2.67,
  minLat: 4.27,
  maxLon: 14.68,
  maxLat: 13.89,
};

export interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export function isInsideBBox(lat: number, lon: number, bbox: BBox): boolean {
  return lon >= bbox.minLon && lon <= bbox.maxLon && lat >= bbox.minLat && lat <= bbox.maxLat;
}

export function bboxCacheKey(gasType: string): string {
  return `nogiet:sat:all:${gasType}`;
}

function mapFeatureToSource(f: any): CarbonMapperSource {
  const rawName: string = f.properties?.source_name ?? f.id ?? "";
  const cleanName = rawName.includes("?") ? rawName.split("?")[0] : rawName;

  return {
    source_name: cleanName,
    lat: f.geometry?.coordinates?.[1] ?? 0,
    lon: f.geometry?.coordinates?.[0] ?? 0,
    sector: f.properties?.sector ?? "",
    gas: f.properties?.gas ?? "CH4",
    emission_rate: f.properties?.emission_auto ?? f.properties?.emission_rate ?? 0,
    persistence: f.properties?.persistence ?? 0,
    plume_count: f.properties?.plume_count ?? 0,
    instrument: f.properties?.instrument ?? "",
    first_detected: f.properties?.timestamp_min ?? f.properties?.first_detected ?? "",
    last_detected: f.properties?.timestamp_max ?? f.properties?.last_detected ?? "",
  };
}

export class CarbonMapperService {
  private baseUrl: string;
  private tokens: CarbonMapperTokens | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.baseUrl = env.CARBON_MAPPER_API_URL;
  }

  get isConfigured(): boolean {
    return !!(env.CARBON_MAPPER_EMAIL && env.CARBON_MAPPER_PASSWORD);
  }

  private async authenticate(): Promise<CarbonMapperTokens> {
    if (!this.isConfigured) {
      throw new Error("CarbonMapper credentials not configured");
    }

    if (this.tokens && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.tokens;
    }

    const response = await fetch(`${this.baseUrl}/token/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: env.CARBON_MAPPER_EMAIL,
        password: env.CARBON_MAPPER_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`CarbonMapper auth failed: ${response.status}`);
    }

    this.tokens = (await response.json()) as CarbonMapperTokens;
    this.tokenExpiry = new Date(Date.now() + 14 * 60 * 1000);
    return this.tokens;
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const tokens = await this.authenticate();
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      });
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tokens.access}` },
    });

    if (response.status === 401) {
      this.tokens = null;
      return this.request<T>(path, params);
    }

    if (!response.ok) {
      throw new Error(`CarbonMapper API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetches ALL sources from CarbonMapper globally.
   * CarbonMapper's bbox param is for DBSCAN clustering, not geographic filtering.
   * Geographic filtering is done server-side after fetching.
   */
  async fetchAllSources(
    filters: Partial<EmissionFilterInput>
  ): Promise<CarbonMapperSource[]> {
    const tokens = await this.authenticate();
    const url = new URL(`${this.baseUrl}/catalog/sources.geojson`);

    url.searchParams.set("plume_gas", filters.gasType ?? "CH4");

    if (filters.sector) url.searchParams.set("sectors", filters.sector);
    if (filters.instrument) url.searchParams.set("instrument", filters.instrument);
    if (filters.minEmissionRate != null) url.searchParams.set("emission_min", String(filters.minEmissionRate));
    if (filters.maxEmissionRate != null) url.searchParams.set("emission_max", String(filters.maxEmissionRate));

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tokens.access}` },
    });

    if (response.status === 401) {
      this.tokens = null;
      return this.fetchAllSources(filters);
    }
    if (!response.ok) {
      throw new Error(`CarbonMapper API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { type: string; features: any[] };
    return (result.features ?? []).map(mapFeatureToSource);
  }

  /**
   * Returns sources filtered to a geographic bounding box.
   * Fetches all globally first, then filters server-side.
   */
  getSourcesInBBox(
    allSources: CarbonMapperSource[],
    bbox: BBox
  ): CarbonMapperSource[] {
    return allSources.filter(s => isInsideBBox(s.lat, s.lon, bbox));
  }

  async getPlumes(sourceId: string): Promise<CarbonMapperPlume[]> {
    const result = await this.request<{
      type: string;
      features: any[];
    }>("/catalog/plumes/annotated", { source_name: sourceId });

    return (result.features ?? []).map((f: any) => ({
      plume_id: f.properties?.plume_id ?? f.id ?? "",
      source_name: f.properties?.source_name ?? "",
      lat: f.geometry?.coordinates?.[1] ?? 0,
      lon: f.geometry?.coordinates?.[0] ?? 0,
      emission_rate: f.properties?.emission_auto ?? f.properties?.emission_rate ?? 0,
      gas: f.properties?.gas ?? "CH4",
      instrument: f.properties?.instrument ?? "",
      datetime: f.properties?.datetime ?? "",
      scene_id: f.properties?.scene_name ?? "",
    }));
  }

  async getSourceDetail(sourceName: string): Promise<CarbonMapperSource | null> {
    try {
      const result = await this.request<any>(
        `/catalog/source/${encodeURIComponent(sourceName)}`
      );

      if (!result) return null;
      return mapFeatureToSource(result);
    } catch {
      return null;
    }
  }

  async getSTACCatalog() {
    return this.request("/stac/");
  }

  async getSTACCollections() {
    return this.request("/stac/collections");
  }

  async searchSTAC(bbox?: string, datetime?: string, collections?: string[]) {
    const tokens = await this.authenticate();

    const body: Record<string, any> = { limit: 50 };
    if (bbox) body.bbox = bbox.split(",").map(Number);
    if (datetime) body.datetime = datetime;
    if (collections) body.collections = collections;

    const response = await fetch(`${this.baseUrl}/stac/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`STAC search failed: ${response.status}`);
    }

    return response.json();
  }
}
