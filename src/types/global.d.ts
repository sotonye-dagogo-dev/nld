// Global type definitions — injected into the TypeScript compiler via
// tsconfig `include` (`src/types/**/*.d.ts`). Because this file has no
// top-level import/export it is a global script: every interface/type below
// is ambient and available in any file WITHOUT an import.
//
// Per engineering directive: "globally defined types and interfaces ... the
// global file injected into typescript such that they don't have to be
// imported in each file."

/** Admin-configurable access model. Config-driven per devotional. */
type AccessMode = "one-time" | "monthly" | "duration";

/** Status lifecycle for a Paystack purchase record. */
type PaymentStatus = "pending" | "success" | "failed";

/** Lifecycle of an access grant. */
type AccessStatus = "active" | "revoked" | "expired";

/** Lifecycle of a devotional (content). */
type DevotionalStatus = "draft" | "published" | "archived";

/** Roles allowed in the admin panel. */
type AdminRole = "owner" | "admin" | "editor";

/** Lifecycle of an admin invitation link. */
type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

/** Category for audit-log entries (engineering principle §23). */
type AuditAction =
  | "devotional.create"
  | "devotional.update"
  | "devotional.delete"
  | "purchase.init"
  | "purchase.verify"
  | "access.grant"
  | "access.verify"
  | "settings.update"
  | "admin.login"
  | "admin.logout"
  | "admin.invite"
  | "admin.invite.accept"
  | "admin.invite.resend"
  | "email_template.update"
  | "asset.upload"
  | "asset.delete"
  | "bank_transfer.submit"
  | "bank_transfer.verify"
  | "bank_transfer.reject";

/** Event names collected for platform analytics (visits, opens, views). */
type PlatformEventType =
  | "page.view"
  | "devotional.open"
  | "devotional.preview"
  | "purchase.started"
  | "purchase.completed"
  | "access.used"
  | "bank_transfer.submitted"
  | "bank_transfer.verified";

/** Bank account configured for transfer payments. */
interface BankAccount {
  id?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  sortCode?: string;
  swiftCode?: string;
  instructions?: string;
  isActive: boolean;
  displayOrder: number;
}

/** Shape of the admin-configurable settings store, mirrored with code fallbacks. */
interface SiteSettings {
  platformName: string;
  tagline: string;
  logoUrl: string;
  currency: string;
  defaultPriceMinor: number; // smallest currency unit (e.g. kobo)
  freePreviewDays: number;
  accessMode: AccessMode;
  antiScreenshotEnabled: boolean;
  paymentsEnabled: boolean;
  paystackEnabled: boolean;
  budpayEnabled: boolean;
  bankTransferEnabled: boolean;
  emailFrom: string;
  supportEmail: string;
  /** Footer developer credit — name shown in footer */
  footerDevCreditName: string;
  /** Footer developer credit — URL linked from name */
  footerDevCreditUrl: string;
  /** Footer developer credit — whether to show the credit */
  footerDevCreditEnabled: boolean;
  /** Bank accounts for transfer payments (fetched separately) */
  bankAccounts?: BankAccount[];
  // Dynamic access & pricing policy (config-driven, backward compatible)
  bundleEnabled: boolean;
  bundlePriceMinor: number;
  bundleAccessMode: AccessMode;
  bundleDurationDays: number;
  allowIndividualPurchase: boolean;
  durationAccessDays: number;
}

/** A single devotional (metadata record; content lives in devotional_days or a single asset). */
interface Devotional {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  coverUrl: string;
  assetUrl: string | null;
  priceMinor: number;
  currency: string;
  accessMode: AccessMode;
  previewDays: number;
  status: DevotionalStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** One day/entry within a devotional. */
interface DevotionalDay {
  id: string;
  devotionalId: string;
  dayNumber: number;
  title: string;
  content: string;
  sermonUrl: string | null;
  contentFileUrl: string | null;
  published: boolean;
}

/** Paystack payment record (email-keyed; no member accounts in MVP). */
interface PurchaseRecord {
  id: string;
  devotionalId: string;
  email: string;
  amountMinor: number;
  currency: string;
  paystackReference: string;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Access grant delivered by email after a verified payment.
 *  `accessPassword` is NOT stored — it is derived deterministically from
 *  `paystackReference` via HMAC (see src/lib/access.ts derivePasswordForGrant).
 *  The grant row holds only the reference; UI derives the password on demand
 *  to maintain viewing/copying flow without a DB column.
 */
interface AccessGrant {
  id: string;
  devotionalId: string;
  email: string;
  paystackReference: string;
  status: AccessStatus;
  expiresAt: Date | null;
  grantedAt: Date;
}

/** Audit trail row (engineering principle §23: actor, timestamp, before/after). */
interface AuditLog {
  id: string;
  actor: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/** Platform analytics event (visits, devotional opens, page views). */
interface PlatformEvent {
  id: string;
  eventType: PlatformEventType;
  slug: string | null;
  email: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

/** Admin identity bound to Supabase Auth. */
interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  createdAt: Date;
}

/** DB-backed, admin-editable email template (§18). */
interface EmailTemplate {
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: Record<string, string>; // variable name → human label (for editor chips)
  updatedBy: string;
  updatedAt: Date;
}

/** Invitation link that turns an email into an admin account. */
interface AdminInvite {
  id: string;
  email: string;
  token: string;
  role: AdminRole;
  invitedBy: string | null;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
}

/** Result of a config read: value plus whether it came from DB or fallback. */
interface ConfigValue<T> {
  value: T;
  source: "db" | "fallback";
}