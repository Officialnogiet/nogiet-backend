import { CarbonMapperService, NIGERIA_BBOX, isInsideBBox } from "./carbon-mapper.service";
import type { BBox } from "./carbon-mapper.service";
import { MethansatService } from "./methansat.service";
import { ImeoService } from "./imeo.service";
import { TropomiService } from "./tropomi.service";
import { CacheService } from "../cache.service";
import type { NormalizedSource, SatelliteProvider, CarbonMapperSource } from "../../types/index";

const ONE_DAY_SEC = 24 * 60 * 60;

function carbonMapperToNormalized(src: CarbonMapperSource): NormalizedSource {
  return {
    id: `cm-${src.source_name}`,
    name: src.source_name,
    provider: "carbon_mapper",
    latitude: src.lat,
    longitude: src.lon,
    emissionRate: src.emission_rate,
    gas: src.gas,
    sector: src.sector,
    instrument: src.instrument,
    persistence: src.persistence,
    plumeCount: src.plume_count,
    firstDetected: src.first_detected,
    lastDetected: src.last_detected,
    metadata: {},
  };
}

export class SatelliteAggregatorService {
  constructor(
    private carbonMapper: CarbonMapperService,
    private methansat: MethansatService,
    private imeo: ImeoService,
    private tropomi: TropomiService,
    private cache: CacheService,
  ) {}

  get configuredProviders(): SatelliteProvider[] {
    const providers: SatelliteProvider[] = [];
    if (this.carbonMapper.isConfigured) providers.push("carbon_mapper");
    if (this.methansat.isConfigured) providers.push("methansat");
    if (this.imeo.isConfigured) providers.push("imeo");
    if (this.tropomi.isConfigured) providers.push("tropomi");
    return providers;
  }

  async fetchAllSources(
    bbox?: BBox,
    providerFilter?: SatelliteProvider,
    gasType: string = "CH4",
  ): Promise<NormalizedSource[]> {
    const cacheKey = `nogiet:sat:aggregated:${gasType}:${providerFilter ?? "all"}`;
    const cached = await this.cache.get<NormalizedSource[]>(cacheKey);
    if (cached) {
      return bbox ? cached.filter(s => isInsideBBox(s.latitude, s.longitude, bbox)) : cached;
    }

    const results = await this.fetchFromProviders(providerFilter, gasType);

    if (results.length > 0) {
      await this.cache.set(cacheKey, results, ONE_DAY_SEC);
    }

    return bbox ? results.filter(s => isInsideBBox(s.latitude, s.longitude, bbox)) : results;
  }

  async refreshAllSources(
    bbox?: BBox,
    providerFilter?: SatelliteProvider,
    gasType: string = "CH4",
  ): Promise<NormalizedSource[]> {
    const cacheKey = `nogiet:sat:aggregated:${gasType}:${providerFilter ?? "all"}`;
    await this.cache.del(cacheKey);

    const results = await this.fetchFromProviders(providerFilter, gasType);

    if (results.length > 0) {
      await this.cache.set(cacheKey, results, ONE_DAY_SEC);
    }

    return bbox ? results.filter(s => isInsideBBox(s.latitude, s.longitude, bbox)) : results;
  }

  private async fetchFromProviders(
    providerFilter?: SatelliteProvider,
    gasType: string = "CH4",
  ): Promise<NormalizedSource[]> {
    const fetchTasks: Promise<NormalizedSource[]>[] = [];

    const shouldFetch = (p: SatelliteProvider) => !providerFilter || providerFilter === p;

    if (shouldFetch("carbon_mapper") && this.carbonMapper.isConfigured) {
      fetchTasks.push(
        this.carbonMapper
          .fetchAllSources({ gasType: gasType as "CH4" | "CO2" })
          .then(sources => sources.map(carbonMapperToNormalized))
          .catch(err => {
            console.warn("[Aggregator] CarbonMapper failed:", err.message);
            return [];
          })
      );
    }

    if (shouldFetch("methansat") && this.methansat.isConfigured) {
      fetchTasks.push(
        this.methansat.fetchSources(NIGERIA_BBOX).catch(err => {
          console.warn("[Aggregator] MethaneSAT failed:", err.message);
          return [];
        })
      );
    }

    if (shouldFetch("imeo") && this.imeo.isConfigured) {
      fetchTasks.push(
        this.imeo.fetchSources(NIGERIA_BBOX).catch(err => {
          console.warn("[Aggregator] IMEO failed:", err.message);
          return [];
        })
      );
    }

    if (shouldFetch("tropomi") && this.tropomi.isConfigured) {
      fetchTasks.push(
        this.tropomi.fetchSources(NIGERIA_BBOX).catch(err => {
          console.warn("[Aggregator] TROPOMI failed:", err.message);
          return [];
        })
      );
    }

    const allResults = await Promise.all(fetchTasks);
    return allResults.flat();
  }
}
