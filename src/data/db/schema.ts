import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const accessModeEnum = pgEnum("access_mode", ["one-time", "monthly", "duration"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "success", "failed"]);
export const accessStatusEnum = pgEnum("access_status", ["active", "revoked", "expired"]);
export const devotionalStatusEnum = pgEnum("devotional_status", ["draft", "published", "archived"]);
export const adminRoleEnum = pgEnum("admin_role", ["owner", "admin", "editor"]);
export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted", "revoked", "expired"]);
export const transferStatusEnum = pgEnum("transfer_status", ["pending", "verified", "rejected"]);
export const paymentMethodEnum = pgEnum("payment_method", ["paystack", "bank_transfer"]);

// ---------------------------------------------------------------------------
// settings — admin-configurable platform values (name, logo, pricing, toggles)
// ---------------------------------------------------------------------------
export const settings = pgTable(
  "settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// ---------------------------------------------------------------------------
// devotionals — top-level content records
// ---------------------------------------------------------------------------
export const devotionals = pgTable(
  "devotionals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    subtitle: text("subtitle").default("").notNull(),
    description: text("description").default("").notNull(),
    coverUrl: text("cover_url").default("").notNull(),
    priceMinor: integer("price_minor").notNull().default(0),
    currency: text("currency").notNull().default("NGN"),
    accessMode: accessModeEnum("access_mode").notNull().default("one-time"),
    previewDays: integer("preview_days").notNull().default(3),
    status: devotionalStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("devotionals_status_idx").on(table.status)],
);

// ---------------------------------------------------------------------------
// devotional_days — one entry per day within a devotional
// ---------------------------------------------------------------------------
export const devotionalDays = pgTable(
  "devotional_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    devotionalId: uuid("devotional_id")
      .notNull()
      .references(() => devotionals.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    sermonUrl: text("sermon_url"),
    contentFileUrl: text("content_file_url"),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("devotional_days_devotional_idx").on(table.devotionalId),
    uniqueIndex("devotional_days_day_unique").on(table.devotionalId, table.dayNumber),
  ],
);

// ---------------------------------------------------------------------------
// purchases — Paystack payment records (email-keyed, no member accounts)
// ---------------------------------------------------------------------------
export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    devotionalId: uuid("devotional_id")
      .notNull()
      .references(() => devotionals.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("NGN"),
    paystackReference: text("paystack_reference").notNull().unique(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("purchases_email_idx").on(table.email),
    index("purchases_status_idx").on(table.status),
  ],
);

// ---------------------------------------------------------------------------
// access_grants — access delivered by email after verified payment
// No `access_password` column — password is derived deterministically from
// `paystack_reference` via HMAC (see src/lib/access.ts). This keeps the
// viewing/copying flow without persisting a separate secret per grant.
// ---------------------------------------------------------------------------
export const accessGrants = pgTable(
  "access_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    devotionalId: uuid("devotional_id")
      .notNull()
      .references(() => devotionals.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    paystackReference: text("paystack_reference").notNull(),
    status: accessStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("access_grants_devotional_email_unique").on(table.devotionalId, table.email),
    index("access_grants_email_idx").on(table.email),
  ],
);

// ---------------------------------------------------------------------------
// audit_logs — engineering principle §23 (actor, timestamp, before/after)
// ---------------------------------------------------------------------------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull().default(""),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entity, table.entityId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// events — platform analytics (visits, devotional opens, page views)
// ---------------------------------------------------------------------------
export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    slug: text("slug"),
    email: text("email"),
    meta: jsonb("meta").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("events_type_created_idx").on(table.eventType, table.createdAt)],
);

// ---------------------------------------------------------------------------
// admins — admin panel identities bound to Supabase Auth
// ---------------------------------------------------------------------------
export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authUserId: uuid("auth_user_id").unique(),
    email: text("email").notNull().unique(),
    role: adminRoleEnum("role").notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// ---------------------------------------------------------------------------
// email_templates — DB-backed email templates with code fallbacks (§18).
// `variables` maps each supported placeholder name to a human label so the
// admin editor can render variable chips without code knowledge.
// ---------------------------------------------------------------------------
export const emailTemplates = pgTable("email_templates", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  variables: jsonb("variables").$type<Record<string, string>>().notNull().default({}),
  updatedBy: text("updated_by").notNull().default("system"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// admin_invites — invitation links that turn an email into an admin account.
// Owner (superadmin) only creates these; the invitee signs up and is added as
// a standard `admin` (no invite privilege).
// ---------------------------------------------------------------------------
export const adminInvites = pgTable(
  "admin_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    role: adminRoleEnum("role").notNull().default("admin"),
    invitedBy: uuid("invited_by").references(() => admins.id, { onDelete: "restrict" }),
    status: inviteStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_invites_status_idx").on(table.status)],
);

// ---------------------------------------------------------------------------
// bank_accounts — admin-configured bank accounts for transfer payments
// Multiple accounts supported for different currencies/regions
// ---------------------------------------------------------------------------
export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bankName: text("bank_name").notNull(),
    accountName: text("account_name").notNull(),
    accountNumber: text("account_number").notNull(),
    currency: text("currency").notNull().default("NGN"),
    sortCode: text("sort_code"), // optional, for international
    swiftCode: text("swift_code"), // optional, for international
    instructions: text("instructions"), // additional instructions for user
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("bank_accounts_active_idx").on(table.isActive)],
);

// ---------------------------------------------------------------------------
// bank_transfers — user-submitted proof of bank transfer payments
// Admin verifies these before granting access
// ---------------------------------------------------------------------------
export const bankTransfers = pgTable(
  "bank_transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    devotionalId: uuid("devotional_id")
      .notNull()
      .references(() => devotionals.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("NGN"),
    bankAccountId: uuid("bank_account_id")
      .notNull()
      .references(() => bankAccounts.id, { onDelete: "restrict" }),
    reference: text("reference").notNull(), // user-provided transfer reference
    proofUrl: text("proof_url").notNull(), // uploaded proof image/document
    status: transferStatusEnum("status").notNull().default("pending"),
    verifiedBy: uuid("verified_by").references(() => admins.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bank_transfers_status_idx").on(table.status),
    index("bank_transfers_email_idx").on(table.email),
    index("bank_transfers_devotional_idx").on(table.devotionalId),
  ],
);