import { NextResponse } from "next/server";

import { getDateInfo } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.settings.findFirst();

  if (!settings) {
    return NextResponse.json(
      { error: "لم يتم تهيئة الإعدادات." },
      { status: 500 },
    );
  }

  const { gregorianDate, hijriDate } = getDateInfo();

  return NextResponse.json({
    schoolName: settings.schoolName,
    managerName: settings.managerName,
    gregorianDate,
    hijriDate,
  });
}
