#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Seed the bootstrap superadmin (role=owner) and email-template defaults.
//
// Usage:
//   SEED_ADMIN_EMAIL=owner@example.com SEED_ADMIN_PASSWORD='s3cret!' npm run db:seed-admin
//   # Idempotent — safe to re-run.
//
//   SEED_ADMIN_EMAIL=owner@example.com npm run db:seed-admin -- --delete
//   # Removes the auth user + admins row for that email.
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL.
//
// NOTE: the seeded account is a bootstrap convenience. After the real owner
// signs in (or is invited), delete this account — `--delete` above, or
// DELETE FROM admins WHERE role='owner' AND email='...'; plus removing the
// Supabase Auth user. The seed password lives in environment/CI config and
// must be rotated/deleted once the real owner takes over.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL.");
  process.exit(1);
}
if (!EMAIL) {
  console.error("Missing SEED_ADMIN_EMAIL.");
  process.exit(1);
}

const DELETE_MODE = process.argv.includes("--delete");

// Mirrors src/config/defaults.ts — bootstrap seed for the email template
// store. The admin editor overrides these rows later; re-seeding never
// overwrites existing edits.
const DEFAULT_TEMPLATES = [
  {
    key: "access_password",
    name: "Access password",
    subject: "Your access to {{devotionalTitle}} on {{platformName}}",
    body_html: [
      "<h1>{{platformName}}</h1>",
      "<p>Thanks for purchasing <strong>{{devotionalTitle}}</strong>.</p>",
      "<p>Use this access password to unlock the devotional:</p>",
      '<div style="display:block;font-size:1.4rem;font-weight:700;letter-spacing:.15em;padding:.75rem 1rem;background:#f1f5f9;border-radius:.5rem;password-box">{{accessPassword}}</div>',
      '<p>Open <a href="{{accessUrl}}">{{accessUrl}}</a> and enter the password to start reading.</p>',
      '<p>Need help? Contact <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>',
    ].join("\n"),
    variables: {
      platformName: "Platform name",
      devotionalTitle: "Devotional title",
      accessPassword: "Access password",
      accessUrl: "Unlock URL",
      supportEmail: "Support email",
    },
  },
  {
    key: "admin_invite",
    name: "Admin invitation",
    subject: "You've been invited to admin {{platformName}}",
    body_html: [
      "<h1>{{platformName}}</h1>",
      "<p>You have been invited to join the admin team for <strong>{{platformName}}</strong>.</p>",
      '<a href="{{inviteUrl}}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:.75rem 1.25rem;border-radius:.5rem;text-decoration:none">Accept invitation</a>',
      "<p>This invitation link expires on {{expiresAt}}.</p>",
    ].join("\n"),
    variables: {
      platformName: "Platform name",
      inviteUrl: "Invitation link",
      expiresAt: "Expiry date",
    },
  },
];

async function main() {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

  if (DELETE_MODE) {
    const { data: users } = await admin.auth.admin.listUsers();
    const match = users?.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
    if (match) {
      await admin.auth.admin.deleteUser(match.id);
      console.log(`Deleted Supabase auth user ${match.id} (${EMAIL}).`);
    } else {
      console.log(`No Supabase auth user found for ${EMAIL}.`);
    }
    await sql`DELETE FROM admins WHERE lower(email) = lower(${EMAIL})`;
    console.log(`Deleted admins row for ${EMAIL}.`);
    await sql.end();
    process.exit(0);
  }

  if (!PASSWORD) {
    console.error("Missing SEED_ADMIN_PASSWORD (not needed with --delete).");
    process.exit(1);
  }

  // Upsert the auth user (email_confirm so login works immediately).
  let authUserId;
  const { data: existing, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;
  const match = existing?.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
  if (match) {
    await admin.auth.admin.updateUserById(match.id, { password: PASSWORD, email_confirm: true });
    authUserId = match.id;
    console.log(`Updated existing auth user ${match.id} (${EMAIL}).`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    authUserId = data.user.id;
    console.log(`Created auth user ${authUserId} (${EMAIL}).`);
  }

  // Upsert the admins row (role=owner = superadmin).
  await sql`
    INSERT INTO admins (auth_user_id, email, role, created_at)
    VALUES (${authUserId}, ${EMAIL}, 'owner', now())
    ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, role = 'owner'
  `;
  console.log(`Upserted admins row for ${EMAIL} as owner (superadmin).`);

  // Seed email-template defaults (never overwrites existing edits).
  for (const t of DEFAULT_TEMPLATES) {
    await sql`
      INSERT INTO email_templates (key, name, subject, body_html, variables, updated_by, updated_at)
      VALUES (${t.key}, ${t.name}, ${t.subject}, ${t.body_html}, ${t.variables}, 'seed', now())
      ON CONFLICT (key) DO NOTHING
    `;
    console.log(`Seeded email template: ${t.key}.`);
  }

  await sql.end();
  console.log("Done. Login at /admin/login with the seeded email + password.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});