import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  isAdminAuthenticated,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedDayTypes = ["ON_SITE", "REMOTE"] as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const dayType = (body?.dayType as string | undefined)?.toUpperCase();

  const settings = await prisma.settings.findFirst();
  const session = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;

  if (!isAdminAuthenticated(session, settings)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  if (!dayType || !allowedDayTypes.includes(dayType as (typeof allowedDayTypes)[number])) {
    return NextResponse.json({ error: "نوع اليوم غير صالح." }, { status: 400 });
  }

  const updated = await prisma.settings.update({
    where: { id: settings!.id },
    data: { currentDayType: dayType },
  });

  return NextResponse.json({ success: true, settings: updated });
}
