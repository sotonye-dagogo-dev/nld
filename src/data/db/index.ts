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

// Serverless-tuned timeouts: cold start p99 ~3-5s on Supabase pooler, so
// query timeout must be > statement_timeout + connect overhead.
// Previous 8000ms raced exactly with Postgres statement_timeout (57014) and
// produced dual unhandled rejections that crashed the lambda (exit 128).
const QUERY_TIMEOUT_MS = 15000;
const CONNECT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 750;

function withTimeout<T>(promise: Promise<T>, ms: number = QUERY_TIMEOUT_MS): Promise<T> {
  // Attach a no-op catch to the original promise to prevent the postgres-js
  // socket rejection (code 57014) from becoming an Unhandled Rejection after
  // Promise.race has already settled via the timeout branch.
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Database query timeout after ${ms}ms`)), ms);
  });
  // Prevent unhandled rejection from the losing branch — also handle
  // the postgres query promise which may reject after race with STATEMENT_TIMEOUT
  // Use a chained catch that swallows but preserves the rejection for the winner
  const safePromise = promise.catch((e) => {
    // Keep for Promise.race rejection path; re-throw via a wrapped promise
    // that will be caught by race winner if needed
    throw e;
  });
  // Ensure both branches never cause unhandled
  safePromise.catch(() => {});
  timeoutPromise.catch(() => {});
  return Promise.race([safePromise, timeoutPromise]).finally(() => clearTimeout(timer!));
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as Record<string, unknown> | null;
  if (!e) return false;
  const code = typeof e.code === "string" ? e.code : "";
  const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPooledDatabaseUrl(): string {
  if (!env.databaseUrl) return "";
  // Supabase pooler is already on 6543 in .env. Only rewrite 5432 -> 6543
  // for local/direct URLs. Do NOT append pgbouncer=true — it forces
  // transaction mode side-effects and is not needed when prepare:false.
  try {
    const url = new URL(env.databaseUrl);
    if (url.hostname.includes("supabase.co") && url.port === "5432") {
      url.port = "6543";
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
  const pgClient = postgres(databaseUrl, {
    max: 3,
    prepare: false,
    connect_timeout: CONNECT_TIMEOUT_MS / 1000,
    idle_timeout: 15,
    max_lifetime: 60 * 8,
    onnotice: () => {},
    fetch_types: false,
    transform: {
      undefined: (val: unknown) => val,
    },
  });
  client = pgClient;
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

function resetPool() {
  const c = client;
  dbInstance = null;
  client = null;
  // Fire-and-forget close of old pool; never block caller
  if (c) c.end({ timeout: 1 }).catch(() => {});
}

export async function queryWithTimeout<T>(
  fn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
  retries = MAX_RETRIES,
  timeoutMs = QUERY_TIMEOUT_MS,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const db = getDb();
    try {
      return await withTimeout(fn(db), timeoutMs);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Never retry unique-constraint violations — caller must handle
      if (isUniqueViolation(lastError)) {
        throw lastError;
      }

      const message = lastError.message.toLowerCase();
      const code = (lastError as unknown as Record<string, unknown>).code;
      const isTimeoutish =
        message.includes("timeout") ||
        message.includes("abort") ||
        message.includes("cancel") ||
        message.includes("57014") ||
        code === "57014";
      // Timeouts are retriable once after a pool reset (transient pooler
      // contention), but not infinitely — one retry max for timeouts.
      if (isTimeoutish) {
        if (attempt < 1) {
          resetPool();
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw lastError;
      }

      // On connection errors, reset the client to force fresh connection
      if (
        message.includes("econnrefused") ||
        message.includes("enotfound") ||
        message.includes("etimedout") ||
        message.includes("connection_ended") ||
        message.includes("connection") ||
        message.includes("socket") ||
        message.includes("eof") ||
        message.includes("pool") ||
        code === "CONNECTION_ENDED"
      ) {
        resetPool();
        if (attempt < retries) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
      } else if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError;
}

export const db = getDb;