import "server-only";

import { env } from "@/config/env";

// Paystack wrapper configuration — server-only. Keys never leave the server.

export const paystackConfig = {
  secretKey: env.paystackSecretKey,
  publicKey: env.paystackPublicKey,
  apiBase: "https://api.paystack.co",
} as const;

export function isPaystackConfigured(): boolean {
  return Boolean(paystackConfig.secretKey && paystackConfig.publicKey);
}