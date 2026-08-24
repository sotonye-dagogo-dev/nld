import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/config/env";
import * as schema from "./schema";

// Drizzle client bound to Supabase Postgres. Created lazily so importing this
// module without DATABASE_URL (e.g. during pure-frontend builds) does not
// throw at import time. All querying is server-only.

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not set — cannot create DB client");
  }
  client = postgres(env.databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export const db = getDb;