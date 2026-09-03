import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";

import { requireAdmin, can } from "@/lib/admin-auth";
import { createSignedUploadUrl } from "@/integrations/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255),
  type: z.enum(["cover", "asset", "sermon"]).default("asset"),
});

const EXT_MAP: Record<string, string[]> = {
  cover: ["jpg", "jpeg", "png", "webp", "gif"],
  asset: ["jpg", "jpeg", "png", "webp", "gif", "pdf", "docx", "doc"],
  sermon: ["jpg", "jpeg", "png", "webp", "gif", "pdf", "docx", "doc"],
};

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin || !can(admin, "devotionals")) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const ext = payload.fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const allowed = EXT_MAP[payload.type] ?? EXT_MAP.asset;
  if (!allowed.includes(ext)) {
    return NextResponse.json({ ok: false, error: `File extension .${ext} not allowed for type ${payload.type}.` }, { status: 400 });
  }

  const path = `${payload.type}/${randomUUID()}.${ext}`;

  try {
    const signed = await createSignedUploadUrl(path);
    return NextResponse.json({ ok: true, path: signed.path, signedUrl: signed.signedUrl, token: signed.token, publicUrl: signed.publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Fallback: if signed URL not available, indicate to use legacy upload
    if (msg.includes("not available")) {
      return NextResponse.json({ ok: false, error: "Direct upload not available. Please use legacy upload or update Supabase SDK." }, { status: 501 });
    }
    console.error("[admin/assets/sign] failed:", err);
    return NextResponse.json({ ok: false, error: `Could not create signed URL: ${msg}` }, { status: 500 });
  }
}
