import "dotenv/config";
import { buildApp } from "./app";
import { env } from "./config/env";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./db/schema/index";
import { connectRedis } from "./config/redis";

async function main() {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  await connectRedis();

  const app = await buildApp(db);

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
    app.log.info(`Docs at http://${env.HOST}:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
