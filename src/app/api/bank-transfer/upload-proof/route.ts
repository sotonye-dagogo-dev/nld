import { NextResponse } from "next/server";
import { uploadAsset } from "@/integrations/supabase/client";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed. Use POST to upload proof." },
    { status: 405, headers: { Allow: "POST" } },
  );
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("payload") || msg.toLowerCase().includes("too large")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "File too large for the server's request limit (Vercel hobby limit ~4.5MB). Please compress the file or use a smaller file.",
        },
        { status: 413 },
      );
    }
    return NextResponse.json({ ok: false, error: "Invalid upload request." }, { status: 400 });
  }
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  const extLower = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExt = ["jpg", "jpeg", "png", "webp", "pdf", "docx"];
  if (!ALLOWED_TYPES.includes(file.type) && file.type !== "" && !allowedExt.includes(extLower)) {
    return NextResponse.json({ ok: false, error: `File type not allowed. Use JPG, PNG, WebP, PDF or DOCX (got ${file.type || "unknown"}).` }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: `File too large (max 50MB, got ${(file.size / 1024 / 1024).toFixed(1)}MB).` }, { status: 400 });
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