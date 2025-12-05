import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  createAdminCookie,
  hashPassword,
  isAdminAuthenticated,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const settings = await prisma.settings.findFirst();
    const session = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;

    if (!isAdminAuthenticated(session, settings)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const oldPassword = body?.oldPassword as string | undefined;
    const newPassword = body?.newPassword as string | undefined;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "الرجاء إدخال كلمة المرور الحالية والجديدة." },
        { status: 400 },
      );
    }

    if (hashPassword(oldPassword) !== settings!.adminPasswordHash) {
      return NextResponse.json(
        { error: "كلمة المرور الحالية غير صحيحة." },
        { status: 400 },
      );
    }

    const updated = await prisma.settings.update({
      where: { id: settings!.id },
      data: { adminPasswordHash: hashPassword(newPassword) },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminCookie(updated), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 6,
    });

    return response;
  } catch (err) {
    console.error("update-password error", err);
    return NextResponse.json(
      { error: "تعذر تحديث كلمة المرور." },
      { status: 500 },
    );
  }
}
