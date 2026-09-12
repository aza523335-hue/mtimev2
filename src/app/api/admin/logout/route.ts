import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, adminCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", { ...adminCookieOptions(request), maxAge: 0 });
  return response;
}
