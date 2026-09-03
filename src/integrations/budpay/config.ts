import "server-only";

import { env } from "@/config/env";

// BudPay wrapper configuration — server-only. Keys never leave the server.
// Mirrors Paystack config structure for consistency.

export const budpayConfig = {
  secretKey: env.budpaySecretKey,
  publicKey: env.budpayPublicKey,
  apiBase: "https://api.budpay.com/api/v2",
} as const;

export function isBudpayConfigured(): boolean {
  return Boolean(budpayConfig.secretKey && budpayConfig.publicKey);
}
