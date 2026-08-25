CREATE TYPE "public"."payment_method" AS ENUM('paystack', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"sort_code" text,
	"swift_code" text,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devotional_id" uuid NOT NULL,
	"email" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"proof_url" text NOT NULL,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "devotional_days" ADD COLUMN "content_file_url" text;--> statement-breakpoint
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_devotional_id_devotionals_id_fk" FOREIGN KEY ("devotional_id") REFERENCES "public"."devotionals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_verified_by_admins_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_accounts_active_idx" ON "bank_accounts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "bank_transfers_status_idx" ON "bank_transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bank_transfers_email_idx" ON "bank_transfers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "bank_transfers_devotional_idx" ON "bank_transfers" USING btree ("devotional_id");