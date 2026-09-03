import { NextResponse } from "next/server";
import { requireAdmin, can } from "@/lib/admin-auth";
import { uploadAsset } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Some browsers send octet-stream for docx/pdf — allow and validate by extension
  "application/octet-stream",
  "application/msword",
];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "docx", "doc"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB generous

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed. Use POST to upload or DELETE to remove an asset." },
    { status: 405, headers: { Allow: "POST, DELETE" } },
  );
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin || !can(admin, "devotionals")) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("payload") || msg.toLowerCase().includes("too large") || msg.toLowerCase().includes("entity")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "File too large for the server's request limit (Vercel hobby limit ~4.5MB). Please compress the file, use a smaller file, or ask the admin to upgrade Vercel to Pro / use direct Supabase upload for 50MB files.",
        },
        { status: 413 },
      );
    }
    return NextResponse.json({ ok: false, error: "Invalid upload request. Please try again." }, { status: 400 });
  }
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null; // "cover" | "sermon" | "asset"

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  const extLower = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeAllowed = ALLOWED_TYPES.includes(file.type) || file.type === "" || file.type === "application/octet-stream";
  const extAllowed = ALLOWED_EXTENSIONS.includes(extLower);
  if (!mimeAllowed && !extAllowed) {
    return NextResponse.json(
      { ok: false, error: `File type not allowed. Allowed: images, PDF, DOCX (got ${file.type || "unknown"} / .${extLower}).` },
      { status: 400 },
    );
  }
  // If mime is octet-stream, require valid extension
  if (file.type === "application/octet-stream" && !extAllowed) {
    return NextResponse.json({ ok: false, error: "File type not allowed for generic binary." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: `File too large (max 50MB, got ${(file.size / 1024 / 1024).toFixed(1)}MB).` }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "Empty file." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const assetType = type ?? "asset";
  const path = `${assetType}/${randomUUID()}.${ext}`;

  try {
    const result = await uploadAsset(buffer, path, file.type);

    await recordAudit({
      actor: admin.email,
      action: "asset.upload",
      entity: "asset",
      entityId: path,
      after: { path, type: assetType, size: file.size, mime: file.type },
    });

    return NextResponse.json({ ok: true, path: result.path, publicUrl: result.publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[admin/assets/upload] failed:", err);
    if (message.includes("bucket") || message.includes("Bucket")) {
      return NextResponse.json(
        { ok: false, error: "Storage bucket not configured. Please create 'devotional-assets' bucket in Supabase (Storage → New bucket → public, name: devotional-assets)." },
        { status: 500 },
      );
    }
    if (message.includes("row-level security") || message.includes("row-level") || message.includes("policy") || message.includes("Policy") || message.includes("permission") || message.includes("Permission")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Storage permission denied (RLS). Apply this policy in Supabase SQL editor: CREATE POLICY \"service_role_all\" ON storage.objects FOR ALL TO service_role USING (true) WITH CHECK (true); Ensure bucket 'devotional-assets' is public and service_role bypasses RLS.",
        },
        { status: 500 },
      );
    }
    if (message.includes("timeout") || message.includes("Timeout") || message.includes("Payload Too Large") || message.includes("413")) {
      return NextResponse.json(
        { ok: false, error: "Upload timeout or payload too large. Vercel free tier limits payload to ~4.5MB; for 50MB files ensure you are on Pro or use direct Supabase upload. Try a smaller file or check connection." },
        { status: 413 },
      );
    }
    return NextResponse.json(
      { ok: false, error: `Upload failed: ${message}` },
      { status: 502 },
    );
  }
}

// Raise Vercel payload handling: Next.js does not expose bodySizeLimit per route,
// but `maxDuration` prevents premature timeout for large uploads.
export const maxDuration = 60;

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin || !can(admin, "devotionals")) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return NextResponse.json({ ok: false, error: "Missing path." }, { status: 400 });
  }

  try {
    await import("@/integrations/supabase/client").then(({ deleteAsset }) => deleteAsset(path));

    await recordAudit({
      actor: admin.email,
      action: "asset.delete",
      entity: "asset",
      entityId: path,
      before: { path },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/assets/delete] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Delete failed. Please try again." },
      { status: 502 },
    );
  }
}