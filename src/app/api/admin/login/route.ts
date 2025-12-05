import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  createAdminCookie,
  hashPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = body?.password as string | undefined;

  if (!password) {
    return NextResponse.json(
      { error: "كلمة المرور مطلوبة" },
      { status: 400 },
    );
  }

  const settings = await prisma.settings.findFirst();

  if (!settings) {
    return NextResponse.json(
      { error: "الإعدادات غير متوفرة" },
      { status: 500 },
    );
  }

  if (hashPassword(password) !== settings.adminPasswordHash) {
    return NextResponse.json(
      { success: false, error: "كلمة المرور غير صحيحة" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set(ADMIN_COOKIE_NAME, createAdminCookie(settings), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  return response;
}
