// Paystack API types (v3) — subset used by this platform.

/** Response envelope for Paystack API calls. */
interface PaystackApiResponse<T> {
  status: boolean;
  message: string;
  data?: T;
}

/** Result of POST /transaction/initialize */
interface PaystackInitializeData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/** Result of GET /transaction/verify/:reference */
interface PaystackVerifyData {
  id: number;
  status: string; // "success" | "failed" | "abandoned"
  reference: string;
  amount: number; // minor unit
  currency: string;
  paid_at: string | null;
  created_at: string;
  customer: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  metadata?: Record<string, unknown>;
}

/** Verified-webhook event payload shape we rely on. */
interface PaystackWebhookEvent {
  event: "charge.success";
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    customer: { email: string };
    metadata?: Record<string, unknown>;
  };
}