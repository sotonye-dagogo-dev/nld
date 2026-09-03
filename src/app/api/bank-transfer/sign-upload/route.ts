import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";

import { createSignedUploadUrl } from "@/integrations/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const ext = payload.fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const allowed = ["jpg", "jpeg", "png", "webp", "pdf", "docx", "doc"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ ok: false, error: `Extension .${ext} not allowed. Use JPG, PNG, WebP, PDF or DOCX.` }, { status: 400 });
  }
  const path = `bank-transfers/${randomUUID()}.${ext}`;
  try {
    const signed = await createSignedUploadUrl(path);
    return NextResponse.json({ ok: true, path: signed.path, signedUrl: signed.signedUrl, token: signed.token, publicUrl: signed.publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not available")) {
      return NextResponse.json({ ok: false, error: "Direct upload not available." }, { status: 501 });
    }
    console.error("[bank-transfer/sign-upload] failed:", err);
    return NextResponse.json({ ok: false, error: `Could not create signed URL: ${msg}` }, { status: 500 });
  }
}
