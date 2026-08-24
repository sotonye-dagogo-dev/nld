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

const QUERY_TIMEOUT_MS = 5000;
const CONNECT_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number = QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database query timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function createPgClient() {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not set — cannot create DB client");
  }
  // Use a short connection timeout and disable prepared statements for PgBouncer compatibility
  // max: 1 to avoid connection pool exhaustion in serverless
  // connect_timeout: 3 seconds to fail fast
  // idle_timeout: 10 seconds, max_lifetime: 5 minutes
  const pgClient = postgres(env.databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: CONNECT_TIMEOUT_MS / 1000,
    idle_timeout: 10,
    max_lifetime: 60 * 5,
    // Fail fast on connection issues
    onnotice: () => {},
    transform: {
      undefined: (val: unknown) => val,
    },
  });
  return pgClient;
}

function createDbClient() {
  const pgClient = createPgClient();
  return drizzle(pgClient, { schema });
}

export function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = createDbClient();
  return dbInstance;
}

export async function queryWithTimeout<T>(fn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>): Promise<T> {
  const db = getDb();
  return withTimeout(fn(db));
}

export const db = getDb;