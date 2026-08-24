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

const QUERY_TIMEOUT_MS = 30000;
const CONNECT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function withTimeout<T>(promise: Promise<T>, ms: number = QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Database query timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPooledDatabaseUrl(): string {
  if (!env.databaseUrl) return "";
  // If using Supabase, prefer the pooler endpoint (port 6543) for serverless
  // The pooler handles connection pooling better than direct connections
  try {
    const url = new URL(env.databaseUrl);
    if (url.hostname.includes("supabase.co") && url.port === "5432") {
      url.port = "6543";
      url.searchParams.set("pgbouncer", "true");
      return url.toString();
    }
  } catch {
    // Ignore URL parsing errors, fall back to original
  }
  return env.databaseUrl;
}

function createPgClient() {
  const databaseUrl = getPooledDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set — cannot create DB client");
  }
  // Use a short connection timeout and disable prepared statements for PgBouncer compatibility
  // max: 10 for serverless to handle concurrent requests
  // connect_timeout: 15 seconds for cold starts
  // idle_timeout: 10 seconds, max_lifetime: 5 minutes
  const pgClient = postgres(databaseUrl, {
    max: 10,
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

export async function queryWithTimeout<T>(
  fn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
  retries = MAX_RETRIES,
  timeoutMs = QUERY_TIMEOUT_MS,
): Promise<T> {
  const db = getDb();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(db), timeoutMs);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Don't retry on timeout or abort errors - they're not transient
      const message = lastError.message.toLowerCase();
      if (
        message.includes("timeout") ||
        message.includes("abort") ||
        message.includes("cancel")
      ) {
        throw lastError;
      }

      // On connection errors, reset the client to force fresh connection
      if (
        message.includes("econnrefused") ||
        message.includes("enotfound") ||
        message.includes("etimedout") ||
        message.includes("connection") ||
        message.includes("socket") ||
        message.includes("eof")
      ) {
        dbInstance = null;
        client = null;
      }

      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError;
}

export const db = getDb;