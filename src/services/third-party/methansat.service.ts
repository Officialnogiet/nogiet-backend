import { env } from "../../config/env";
import type { NormalizedSource } from "../../types/index";

/**
 * MethaneSAT / EMIT NASA integration.
 *
 * MethaneSAT provides area-based methane concentration data via the EDF platform.
 * EMIT (Earth Surface Mineral Dust Source Investigation) from NASA/JPL detects
 * point-source methane plumes.
 *
 * When real API credentials are available, this service will call the live
 * endpoints. Until then it returns an empty array gracefully.
 */
export class MethansatService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.METHANSAT_API_URL ?? "";
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && env.METHANSAT_API_KEY);
  }

  async fetchSources(bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number }): Promise<NormalizedSource[]> {
    if (!this.isConfigured) return [];

    try {
      const url = new URL(`${this.baseUrl}/sources`);
      if (bbox) {
        url.searchParams.set("bbox", `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${env.METHANSAT_API_KEY}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`[MethaneSAT] API returned ${response.status}`);
        return [];
      }

      const data = await response.json() as { features?: any[] };
      return (data.features ?? []).map((f: any) => this.normalize(f));
    } catch (err: any) {
      console.warn("[MethaneSAT] fetch failed:", err.message);
      return [];
    }
  }

  private normalize(feature: any): NormalizedSource {
    const props = feature.properties ?? {};
    const coords = feature.geometry?.coordinates ?? [0, 0];
    return {
      id: `methansat-${props.id ?? props.source_id ?? Math.random().toString(36).slice(2)}`,
      name: props.name ?? props.source_name ?? "Unknown",
      provider: "methansat",
      latitude: coords[1] ?? 0,
      longitude: coords[0] ?? 0,
      emissionRate: props.emission_rate ?? props.flux ?? 0,
      gas: props.gas ?? "CH4",
      sector: props.sector ?? "",
      instrument: props.instrument ?? "MethaneSAT",
      persistence: props.persistence ?? 0,
      plumeCount: props.plume_count ?? 1,
      firstDetected: props.first_detected ?? props.start_time ?? "",
      lastDetected: props.last_detected ?? props.end_time ?? "",
      metadata: {
        raw_id: props.id,
        concentration: props.concentration,
        uncertainty: props.uncertainty,
      },
    };
  }
}
