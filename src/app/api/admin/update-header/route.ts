import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  isAdminAuthenticated,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const settings = await prisma.settings.findFirst();
  const session = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;

  if (!isAdminAuthenticated(session, settings)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const schoolName = body?.schoolName as string | undefined;
  const managerName = body?.managerName as string | undefined;

  if (!schoolName || !managerName) {
    return NextResponse.json(
      { error: "الرجاء إدخال اسم المدرسة واسم المدير." },
      { status: 400 },
    );
  }

  const updated = await prisma.settings.update({
    where: { id: settings!.id },
    data: { schoolName, managerName },
  });

  return NextResponse.json({ success: true, settings: updated });
}
