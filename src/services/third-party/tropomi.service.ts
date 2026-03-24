import { env } from "../../config/env";
import type { NormalizedSource } from "../../types/index";

/**
 * Sentinel-5P TROPOMI integration.
 *
 * TROPOMI (TROPOspheric Monitoring Instrument) on the Copernicus Sentinel-5P
 * satellite provides global atmospheric composition data including CH4 columns.
 * Data is available through the Copernicus Data Space Ecosystem (CDSE) or
 * Google Earth Engine.
 *
 * When real API credentials are available, this service will call the live
 * endpoints. Until then it returns an empty array gracefully.
 */
export class TropomiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.TROPOMI_API_URL ?? "";
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && env.TROPOMI_API_KEY);
  }

  async fetchSources(bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number }): Promise<NormalizedSource[]> {
    if (!this.isConfigured) return [];

    try {
      const url = new URL(`${this.baseUrl}/products`);
      if (bbox) {
        url.searchParams.set("bbox", `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`);
      }
      url.searchParams.set("product_type", "L2__CH4___");

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${env.TROPOMI_API_KEY}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`[TROPOMI] API returned ${response.status}`);
        return [];
      }

      const data = await response.json() as { features?: any[] };
      return (data.features ?? []).map((f: any) => this.normalize(f));
    } catch (err: any) {
      console.warn("[TROPOMI] fetch failed:", err.message);
      return [];
    }
  }

  private normalize(feature: any): NormalizedSource {
    const props = feature.properties ?? {};
    const coords = feature.geometry?.coordinates ?? [0, 0];
    const lat = Array.isArray(coords[0]) ? coords[0][1] : coords[1];
    const lon = Array.isArray(coords[0]) ? coords[0][0] : coords[0];

    return {
      id: `tropomi-${props.id ?? props.granule_id ?? Math.random().toString(36).slice(2)}`,
      name: props.name ?? props.granule_id ?? `TROPOMI-${props.id}`,
      provider: "tropomi",
      latitude: lat ?? 0,
      longitude: lon ?? 0,
      emissionRate: props.emission_rate ?? props.xch4_corrected ?? 0,
      gas: "CH4",
      sector: props.sector ?? "",
      instrument: "TROPOMI/Sentinel-5P",
      persistence: props.persistence ?? 0,
      plumeCount: props.plume_count ?? 1,
      firstDetected: props.time_start ?? props.sensing_start ?? "",
      lastDetected: props.time_end ?? props.sensing_end ?? "",
      metadata: {
        raw_id: props.id,
        qa_value: props.qa_value,
        cloud_fraction: props.cloud_fraction,
        orbit: props.orbit,
      },
    };
  }
}
