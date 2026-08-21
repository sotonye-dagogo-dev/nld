import { NextResponse } from "next/server";

import { destroyAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}