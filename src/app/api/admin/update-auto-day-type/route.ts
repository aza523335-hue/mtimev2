import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  isAdminAuthenticated,
} from "@/lib/auth";
import { applyAutoDayType, serializeDaysField } from "@/lib/day-type";
import { isTuesdayDate } from "@/lib/schedule";
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
    const { scheduleMode, tuesdayReferenceDate, tuesdayReferenceType, onSiteDays, remoteDays } = body ?? {};
    if (!["ON_SITE", "REMOTE", "AUTO"].includes(scheduleMode)) {
      return NextResponse.json({ error: "اختر نمط دوام صالحًا." }, { status: 400 });
    }
    // Fixed modes keep the saved automatic schedule, including its reference date.
    if (scheduleMode !== "AUTO") {
      const updated = await prisma.settings.update({
        where: { id: settings.id },
        data: { scheduleMode, currentDayType: scheduleMode, autoDayTypeEnabled: false },
      });
      return NextResponse.json({ success: true, appliedDayType: updated.currentDayType });
    }
    const validDays = (days: unknown): days is number[] => Array.isArray(days) &&
      days.every((day) => Number.isInteger(day) && day >= 0 && day <= 4 && day !== 2) &&
      new Set(days).size === days.length;
    if (!validDays(onSiteDays) || !validDays(remoteDays) ||
        onSiteDays.some((day) => remoteDays.includes(day)) || onSiteDays.length + remoteDays.length !== 4) {
      return NextResponse.json({ error: "حدد نوع الدوام لأيام الأحد والاثنين والأربعاء والخميس، لكل يوم مرة واحدة." }, { status: 400 });
    }
    if ((scheduleMode === "AUTO" || tuesdayReferenceDate) && !isTuesdayDate(tuesdayReferenceDate)) {
      return NextResponse.json({ error: "اختر تاريخًا صحيحًا يوافق يوم الثلاثاء." }, { status: 400 });
    }
    if (!["ON_SITE", "REMOTE"].includes(tuesdayReferenceType)) {
      return NextResponse.json({ error: "حدد نوع دوام الثلاثاء المرجعي." }, { status: 400 });
    }
    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        scheduleMode,
        autoDayTypeEnabled: scheduleMode === "AUTO",
        onSiteDays: serializeDaysField(onSiteDays),
        remoteDays: serializeDaysField(remoteDays),
        tuesdayReferenceDate: tuesdayReferenceDate || null,
        tuesdayReferenceType,
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
