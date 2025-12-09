import { NextResponse } from "next/server";

import { getDateInfo } from "@/lib/date-utils";
import { applyAutoDayType } from "@/lib/day-type";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await applyAutoDayType(
    await prisma.settings.findFirst(),
    new Date(),
  );

  if (!settings) {
    return NextResponse.json(
      { error: "لم يتم تهيئة الإعدادات." },
      { status: 500 },
    );
  }

  const periods = await prisma.period.findMany({
    where: { dayType: settings.currentDayType },
    orderBy: { order: "asc" },
  });

  const { gregorianDate, hijriDate, gregorianMonthNumber, hijriMonthNumber } =
    getDateInfo();

  return NextResponse.json({
    dayType: settings.currentDayType,
    periods,
    header: {
      schoolName: settings.schoolName,
      managerName: settings.managerName,
    },
    updatedAt: settings.updatedAt,
    gregorianDate,
    hijriDate,
    gregorianMonthNumber,
    hijriMonthNumber,
  });
}
