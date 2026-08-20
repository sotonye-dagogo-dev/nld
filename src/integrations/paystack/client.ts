import "server-only";

import { createHmac } from "node:crypto";
import { paystackConfig } from "./config";

// Paystack client wrapper — the ONLY place the Paystack SDK/API is touched
// (engineering principle §17). Call sites never import Paystack directly.

type Json = Record<string, unknown>;

async function request<T>(path: string, init: RequestInit = {}): Promise<PaystackApiResponse<T>> {
  const res = await fetch(`${paystackConfig.apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${paystackConfig.secretKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Paystack request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as PaystackApiResponse<T>;
}

/** Initialize a one-time payment for a devotional purchase. */
export async function initializeTransaction(input: {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Json;
}): Promise<PaystackInitializeData> {
  const body = {
    email: input.email,
    amount: input.amountMinor,
    currency: input.currency,
    reference: input.reference,
    callback_url: input.callbackUrl,
    metadata: input.metadata,
  };
  const res = await request<PaystackInitializeData>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.status || !res.data) {
    throw new Error(`Paystack initialize failed: ${res.message}`);
  }
  return res.data;
}

/** Verify a transaction reference server-side (authoritative status). */
export async function verifyTransaction(reference: string): Promise<PaystackVerifyData> {
  const res = await request<PaystackVerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (!res.status || !res.data) {
    throw new Error(`Paystack verify failed: ${res.message}`);
  }
  return res.data;
}

/**
 * Verify a Paystack webhook signature. Must hash the RAW request body (before
 * JSON parsing) with the secret key using HMAC-SHA512.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !paystackConfig.secretKey) return false;
  const expected = createHmac("sha512", paystackConfig.secretKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}