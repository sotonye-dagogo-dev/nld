import "server-only";

import { getDb } from "@/data/db";
import { auditLogs, events } from "@/data/db/schema";

// Audit trail writer (engineering principle §23) and platform analytics event
// recorder. Both are fire-and-forget writes that must never break a request
// when the DB is down — errors are swallowed and, in dev, surfaced to console.

type Json = Record<string, unknown> | null;

/** Record a state-changing action with actor, before/after diff, and metadata. */
export async function recordAudit(input: {
  actor: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  before?: Json;
  after?: Json;
  metadata?: Json;
}): Promise<void> {
  try {
    await getDb().insert(auditLogs).values({
      actor: input.actor,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? "",
      before: input.before ?? null,
      after: input.after ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error("[audit] write failed (non-fatal):", err);
  }
}

/** Record a platform analytics event (visits, devotional opens, page views). */
export async function recordEvent(input: {
  eventType: PlatformEventType;
  slug?: string | null;
  email?: string | null;
  meta?: Json;
}): Promise<void> {
  try {
    await getDb().insert(events).values({
      eventType: input.eventType,
      slug: input.slug ?? null,
      email: input.email ?? null,
      meta: input.meta ?? null,
    });
  } catch (err) {
    console.error("[events] write failed (non-fatal):", err);
  }
}