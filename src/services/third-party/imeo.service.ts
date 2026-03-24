import { env } from "../../config/env";
import type { NormalizedSource } from "../../types/index";

/**
 * UNEP International Methane Emissions Observatory (IMEO) integration.
 *
 * IMEO aggregates methane data from multiple satellites and integrates
 * reported emissions with satellite detections. The Methane Alert and
 * Response System (MARS) provides notifications of large emission events.
 *
 * When real API credentials are available, this service will call the live
 * endpoints. Until then it returns an empty array gracefully.
 */
export class ImeoService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.IMEO_API_URL ?? "";
  }

  get isConfigured(): boolean {
    return !!(this.baseUrl && env.IMEO_API_KEY);
  }

  async fetchSources(bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number }): Promise<NormalizedSource[]> {
    if (!this.isConfigured) return [];

    try {
      const url = new URL(`${this.baseUrl}/events`);
      if (bbox) {
        url.searchParams.set("min_lon", String(bbox.minLon));
        url.searchParams.set("min_lat", String(bbox.minLat));
        url.searchParams.set("max_lon", String(bbox.maxLon));
        url.searchParams.set("max_lat", String(bbox.maxLat));
      }
      url.searchParams.set("country", "NGA");

      const response = await fetch(url.toString(), {
        headers: {
          "X-API-Key": env.IMEO_API_KEY!,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`[IMEO] API returned ${response.status}`);
        return [];
      }

      const data = await response.json() as { results?: any[] };
      return (data.results ?? []).map((e: any) => this.normalize(e));
    } catch (err: any) {
      console.warn("[IMEO] fetch failed:", err.message);
      return [];
    }
  }

  private normalize(event: any): NormalizedSource {
    return {
      id: `imeo-${event.id ?? Math.random().toString(36).slice(2)}`,
      name: event.name ?? event.source_name ?? `IMEO-${event.id}`,
      provider: "imeo",
      latitude: event.latitude ?? event.lat ?? 0,
      longitude: event.longitude ?? event.lon ?? 0,
      emissionRate: event.emission_rate ?? event.estimated_emission ?? 0,
      gas: event.gas ?? "CH4",
      sector: event.sector ?? event.category ?? "",
      instrument: event.satellite ?? event.instrument ?? "IMEO",
      persistence: event.persistence ?? 0,
      plumeCount: event.plume_count ?? event.detection_count ?? 1,
      firstDetected: event.first_detected ?? event.start_date ?? "",
      lastDetected: event.last_detected ?? event.end_date ?? "",
      metadata: {
        raw_id: event.id,
        country: event.country,
        notification_level: event.notification_level,
        status: event.status,
      },
    };
  }
}
