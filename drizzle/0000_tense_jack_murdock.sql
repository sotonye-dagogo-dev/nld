CREATE TYPE "public"."access_mode" AS ENUM('one-time', 'monthly', 'duration');--> statement-breakpoint
CREATE TYPE "public"."access_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('owner', 'admin', 'editor');--> statement-breakpoint
CREATE TYPE "public"."devotional_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devotional_id" uuid NOT NULL,
	"email" text NOT NULL,
	"paystack_reference" text NOT NULL,
	"access_password" text NOT NULL,
	"status" "access_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text DEFAULT '' NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devotional_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devotional_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"sermon_url" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devotionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"price_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"access_mode" "access_mode" DEFAULT 'one-time' NOT NULL,
	"preview_days" integer DEFAULT 3 NOT NULL,
	"status" "devotional_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devotionals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"slug" text,
	"email" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devotional_id" uuid NOT NULL,
	"email" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"paystack_reference" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_paystack_reference_unique" UNIQUE("paystack_reference")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_devotional_id_devotionals_id_fk" FOREIGN KEY ("devotional_id") REFERENCES "public"."devotionals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_days" ADD CONSTRAINT "devotional_days_devotional_id_devotionals_id_fk" FOREIGN KEY ("devotional_id") REFERENCES "public"."devotionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_devotional_id_devotionals_id_fk" FOREIGN KEY ("devotional_id") REFERENCES "public"."devotionals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_grants_devotional_email_unique" ON "access_grants" USING btree ("devotional_id","email");--> statement-breakpoint
CREATE INDEX "access_grants_email_idx" ON "access_grants" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "devotional_days_devotional_idx" ON "devotional_days" USING btree ("devotional_id");--> statement-breakpoint
CREATE UNIQUE INDEX "devotional_days_day_unique" ON "devotional_days" USING btree ("devotional_id","day_number");--> statement-breakpoint
CREATE INDEX "devotionals_status_idx" ON "devotionals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_type_created_idx" ON "events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "purchases_email_idx" ON "purchases" USING btree ("email");--> statement-breakpoint
CREATE INDEX "purchases_status_idx" ON "purchases" USING btree ("status");