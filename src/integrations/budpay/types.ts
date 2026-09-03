// BudPay API types — mirrored to Paystack types for consistency.

/** Response envelope for BudPay initialize */
interface BudpayInitializeResponse {
  status: boolean;
  message: string;
  data?: BudpayInitializeData;
}

interface BudpayInitializeData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/** Result of GET /transaction/verify/:reference */
interface BudpayVerifyData {
  status: string;
  reference: string;
  amount: string; // BudPay returns amount as string
  requested_amount?: string;
  currency: string;
  domain?: string;
  fees?: string;
  gateway?: string;
  channel?: string;
  message?: string;
  paid_at?: string | null;
  created_at?: string;
  customer: {
    email: string;
    id?: number;
    customer_code?: string;
  };
}

/** BudPay webhook payload for transaction */
interface BudpayWebhookEvent {
  notify: "transaction" | "payout" | "virtual_account";
  notifyType: "successful" | "failed" | "pending";
  data: {
    reference: string;
    status: string;
    amount: string;
    requested_amount?: string;
    currency: string;
    channel?: string;
    domain?: string;
    fees?: string;
    message?: string;
    customer: {
      email: string;
      id?: number;
      customer_code?: string;
    };
    paid_at?: string;
    created_at?: string;
  };
}
