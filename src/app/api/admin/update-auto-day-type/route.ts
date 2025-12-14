import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  isAdminAuthenticated,
} from "@/lib/auth";
import {
  applyAutoDayType,
  normalizeDayList,
  normalizeTuesdayMode,
  serializeDaysField,
} from "@/lib/day-type";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const settings = await prisma.settings.findFirst();
    const session = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;

    if (!settings) {
      return NextResponse.json({ error: "لم يتم ضبط الإعدادات بعد." }, { status: 400 });
    }

    if (!isAdminAuthenticated(session, settings)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const autoDayTypeEnabled = Boolean(body?.autoDayTypeEnabled);
    const onSiteDays = normalizeDayList(body?.onSiteDays);
    const remoteDays = normalizeDayList(body?.remoteDays);
    const tuesdayMode = normalizeTuesdayMode(body?.tuesdayMode);

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        autoDayTypeEnabled,
        onSiteDays: serializeDaysField(onSiteDays),
        remoteDays: serializeDaysField(remoteDays),
        tuesdayMode,
      },
    });

    const applied = await applyAutoDayType(updated);

    return NextResponse.json({
      success: true,
      settings: applied,
      appliedDayType: applied?.currentDayType,
    });
  } catch (err) {
    console.error("Failed to update auto day type", err);
    return NextResponse.json(
      { error: "تعذر حفظ التبديل التلقائي" },
      { status: 500 },
    );
  }
}
