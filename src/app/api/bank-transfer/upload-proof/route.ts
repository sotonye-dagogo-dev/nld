import { NextResponse } from "next/server";
import { uploadAsset } from "@/integrations/supabase/client";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "File type not allowed. Use JPG, PNG, WebP, or PDF." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: "File too large (max 10MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `bank-transfers/${randomUUID()}.${ext}`;

  try {
    const result = await uploadAsset(buffer, path, file.type);
    return NextResponse.json({ ok: true, url: result.publicUrl });
  } catch (err) {
    console.error("[bank-transfer/upload-proof] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Upload failed. Please try again." },
      { status: 502 },
    );
  }
}