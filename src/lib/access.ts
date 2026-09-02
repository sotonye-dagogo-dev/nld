import "server-only";

import { createHmac } from "node:crypto";
import { env } from "@/config/env";

// Access password derivation & verification.
//
// Decision (memory/project-decisions.md): the access password is derived
// deterministically from the Paystack transaction reference using HMAC, so a
// verified purchase produces a password with no extra secret storage and the
// /access verification page can recompute it from the stored reference.

const PASSWORD_LENGTH = 12;
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

function hashReference(reference: string): Buffer {
  return createHmac("sha256", env.accessPasswordSecret)
    .update(reference)
    .digest();
}

/** Derive the access password for a given Paystack transaction reference. */
export function deriveAccessPassword(paystackReference: string): string {
  const digest = hashReference(paystackReference);
  let out = "";
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    out += PASSWORD_ALPHABET[digest[i] % PASSWORD_ALPHABET.length];
  }
  return out;
}

/** Base reference stripping bundle/lazy suffixes (e.g. NL-xxx__devId -> NL-xxx). */
export function baseReference(ref: string): string {
  const idx = ref.indexOf("__");
  return idx === -1 ? ref : ref.slice(0, idx);
}

/** Derive password for a stored grant's paystack_reference (handles suffix variants). */
export function derivePasswordForGrant(paystackReference: string): string {
  return deriveAccessPassword(baseReference(paystackReference));
}

/**
 * Compute expiry for an access grant based on the platform/devotional
 * accessMode configuration. Returns null for forever (one-time), or a Date
 * for time-bound modes. Duration days are config-driven when provided.
 */
export function computeExpiry(accessMode: AccessMode, durationDays?: number): Date | null {
  const now = new Date();
  switch (accessMode) {
    case "one-time":
      return null;
    case "monthly":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "duration": {
      const days = Number.isFinite(durationDays as number) && (durationDays as number) > 0 ? (durationDays as number) : 60;
      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
    default:
      return null;
  }
}

/**
 * Verify a submitted access password against a stored grant whose password
 * was derived from `paystackReference`. Uses a constant-time compare to avoid
 * leaking timing information.
 */
export function verifyAccessPassword(
  submitted: string,
  expected: string,
): boolean {
  if (typeof submitted !== "string" || typeof expected !== "string") {
    return false;
  }
  const a = Buffer.from(submitted.trim().toUpperCase());
  const b = Buffer.from(expected.trim().toUpperCase());
  if (a.length !== b.length) return false;
  // constant-time comparison
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}