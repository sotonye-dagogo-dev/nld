import "server-only";

// Performance monitoring utilities for scalability and compliance
// Provides timing, metrics collection, and health checks

export interface PerformanceMetrics {
  operation: string;
  durationMs: number;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, unknown>;
}

const metricsBuffer: PerformanceMetrics[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Record a performance metric
 */
export function recordMetric(metric: PerformanceMetrics): void {
  metricsBuffer.push(metric);
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift();
  }
  
  // In production, this would send to a monitoring service
  if (process.env.NODE_ENV === "production") {
    // Could integrate with Vercel Analytics, Datadog, etc.
    console.debug("[PERF]", metric.operation, `${metric.durationMs}ms`, metric.success ? "OK" : "FAIL");
  }
}

/**
 * Wrap an async operation with performance timing
 */
export async function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  let success = true;
  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const durationMs = performance.now() - start;
    recordMetric({
      operation,
      durationMs,
      timestamp: new Date(),
      success,
      metadata,
    });
  }
}

/**
 * Get current metrics buffer (for health check endpoints)
 */
export function getMetrics(): PerformanceMetrics[] {
  return [...metricsBuffer];
}

/**
 * Clear metrics buffer
 */
export function clearMetrics(): void {
  metricsBuffer.length = 0;
}

/**
 * Health check for database connectivity
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}> {
  try {
    const { queryWithTimeout } = await import("@/data/db");
    const start = performance.now();
    await queryWithTimeout((db) => db.execute(sql`SELECT 1`), 5000);
    const latencyMs = performance.now() - start;
    return { healthy: true, latencyMs };
  } catch (error) {
    return { healthy: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Health check for external services
 */
export async function checkExternalServices(): Promise<Record<string, { healthy: boolean; latencyMs?: number; error?: string }>> {
  const results: Record<string, { healthy: boolean; latencyMs?: number; error?: string }> = {};

  // Check Resend (if configured)
  if (process.env.RESEND_API_KEY) {
    try {
      const start = performance.now();
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.domains.list(); // Lightweight API call
      results.resend = { healthy: true, latencyMs: performance.now() - start };
    } catch (error) {
      results.resend = { healthy: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  // Check Paystack (if configured)
  if (process.env.PAYSTACK_SECRET_KEY) {
    try {
      const start = performance.now();
      const response = await fetch("https://api.paystack.co/bank", {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      results.paystack = { healthy: response.ok, latencyMs: performance.now() - start };
    } catch (error) {
      results.paystack = { healthy: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  // Check Supabase Storage (if configured)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const start = performance.now();
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await supabase.storage.listBuckets();
      results.supabaseStorage = { healthy: true, latencyMs: performance.now() - start };
    } catch (error) {
      results.supabaseStorage = { healthy: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  return results;
}

/**
 * Comprehensive health check for load balancer / monitoring
 */
export async function healthCheck(): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  checks: Record<string, { healthy: boolean; latencyMs?: number; error?: string }>;
}> {
  const [dbHealth, externalHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkExternalServices(),
  ]);

  const checks = {
    database: dbHealth,
    ...externalHealth,
  };

  const allHealthy = Object.values(checks).every((c) => c.healthy);
  const anyHealthy = Object.values(checks).some((c) => c.healthy);

  return {
    status: allHealthy ? "healthy" : anyHealthy ? "degraded" : "unhealthy",
    timestamp: new Date(),
    checks,
  };
}

// SQL template tag for raw queries
import { sql } from "drizzle-orm";

/**
 * Request timeout wrapper for API routes
 */
export function withRequestTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Rate limiting helper (simple in-memory, use Redis for production clusters)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

// Periodic cleanup
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimits, 5 * 60 * 1000); // Every 5 minutes
}