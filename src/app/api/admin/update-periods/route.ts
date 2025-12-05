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

type PeriodInput = {
  order: number;
  name?: string;
  startTime: string;
  endTime: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const dayType = (body?.dayType as string | undefined)?.toUpperCase();
    const periods = Array.isArray(body?.periods) ? (body.periods as PeriodInput[]) : [];

    const settings = await prisma.settings.findFirst();
    const session = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;

    if (!isAdminAuthenticated(session, settings)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    if (!dayType || !allowedDayTypes.includes(dayType as (typeof allowedDayTypes)[number])) {
      return NextResponse.json({ error: "نوع اليوم غير صالح." }, { status: 400 });
    }

    if (!Array.isArray(periods)) {
      return NextResponse.json({ error: "لا توجد حصص محدثة." }, { status: 400 });
    }

    const invalid = periods.find(
      (p) =>
        typeof p.order !== "number" ||
        !Number.isFinite(p.order) ||
        p.order <= 0 ||
        !p.startTime ||
        !p.endTime ||
        (p.name !== undefined && typeof p.name !== "string") ||
        typeof p.startTime !== "string" ||
        typeof p.endTime !== "string",
    );

    if (invalid) {
      return NextResponse.json(
        { error: "صيغة الحصص غير صحيحة." },
        { status: 400 },
      );
    }

    const normalized = periods
      .map((p) => ({
        ...p,
        order: Number(p.order),
        name: (p.name ?? "").trim(),
      }))
      .sort((a, b) => a.order - b.order)
      .map((p, idx) => ({ ...p, order: idx + 1 }));
    console.log("update-periods payload", { dayType, periods: normalized.length });

    await prisma.$transaction(async (tx) => {
      await tx.period.deleteMany({ where: { dayType } });
      if (normalized.length > 0) {
        await tx.period.createMany({
          data: normalized.map((p) => ({
            dayType,
            order: p.order,
            name: p.name,
            startTime: p.startTime,
            endTime: p.endTime,
          })),
        });
      }
      await tx.settings.update({
        where: { id: settings!.id },
        data: { updatedAt: new Date() },
      });
    });
  } catch (err) {
    console.error("update-periods error", err);
    return NextResponse.json(
      {
        error: "تعذر حفظ الحصص.",
        detail:
          err instanceof Error
            ? `${err.name}: ${err.message}`
            : JSON.stringify(err),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
