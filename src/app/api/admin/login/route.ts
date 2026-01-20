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

  const providedHash = hashPassword(password);
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
  const defaultHash = hashPassword(defaultPassword);

  let settings = await prisma.settings.findFirst();

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        currentDayType: "ON_SITE",
        tuesdayOddWeekType: "ON_SITE",
        tuesdayEvenWeekType: "REMOTE",
        adminPasswordHash: defaultHash,
        schoolName: "مدرسة المستقبل",
        managerName: "أ. محمد العتيبي",
      },
    });
  }

  const matchesStored = providedHash === settings.adminPasswordHash;
  const matchesDefault = providedHash === defaultHash;

  // Allow the default password as a recovery option and sync it to the DB if used.
  if (!matchesStored && matchesDefault && settings.adminPasswordHash !== defaultHash) {
    settings = await prisma.settings.update({
      where: { id: settings.id },
      data: { adminPasswordHash: defaultHash },
    });
  }

  if (!matchesStored && !matchesDefault) {
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
