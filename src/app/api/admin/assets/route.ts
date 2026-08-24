import { NextResponse } from "next/server";
import { requireAdmin, can } from "@/lib/admin-auth";
import { uploadAsset } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin || !can(admin, "devotionals")) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null; // "cover" | "sermon" | "asset"

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "File type not allowed." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: "File too large (max 5MB)." }, { status: 400 });
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
    console.error("[admin/assets/upload] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Upload failed. Please try again." },
      { status: 502 },
    );
  }
}

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