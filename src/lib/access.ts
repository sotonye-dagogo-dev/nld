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