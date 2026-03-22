import Redis from "ioredis";
import { env } from "./env";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redis.on("error", (err) => {
      console.warn("[Redis] connection error, caching disabled:", err.message);
    });
  }
  return redis;
}

export async function connectRedis(): Promise<boolean> {
  try {
    const r = getRedis();
    await r.connect();
    console.log("[Redis] connected");
    return true;
  } catch {
    console.warn("[Redis] failed to connect, running without cache");
    return false;
  }
}
