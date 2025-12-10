import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const toDateInput = (value: Date) => value.toISOString().split("T")[0];

const normalizeDate = (value: string | undefined | null, endOfDay = false) => {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTerms = (terms: { id: number; name: string; startDate: Date; endDate: Date }[]) =>
  terms
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((term) => ({
      id: term.id,
      name: term.name,
      startDate: toDateInput(term.startDate),
      endDate: toDateInput(term.endDate),
    }));

export async function GET() {
  const settings = await prisma.settings.findFirst();
  const session = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;

  if (!isAdminAuthenticated(session, settings)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const terms = await prisma.term.findMany({ orderBy: { startDate: "asc" } });
  return NextResponse.json({ terms: formatTerms(terms) });
}

export async function POST(request: Request) {
  const settings = await prisma.settings.findFirst();
  const session = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;

  if (!isAdminAuthenticated(session, settings)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const incoming = Array.isArray(body?.terms) ? body?.terms : null;

  if (!incoming) {
    return NextResponse.json(
      { error: "تنسيق غير صالح للبيانات المرسلة." },
      { status: 400 },
    );
  }

  const normalized: {
    id?: number;
    name: string;
    startDate: Date;
    endDate: Date;
  }[] = [];

  for (const term of incoming) {
    const name = String(term?.name ?? "").trim();
    const startDateStr = typeof term?.startDate === "string" ? term.startDate : "";
    const endDateStr = typeof term?.endDate === "string" ? term.endDate : "";

    if (!name || !startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: "يرجى إدخال اسم الترم وتواريخ البداية والنهاية." },
        { status: 400 },
      );
    }

    const startDate = normalizeDate(startDateStr);
    const endDate = normalizeDate(endDateStr, true);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "تواريخ غير صالحة. يرجى استخدام صيغة يوم/شهر/سنة صحيحة." },
        { status: 400 },
      );
    }

    if (endDate.getTime() < startDate.getTime()) {
      return NextResponse.json(
        { error: "يجب أن يكون تاريخ النهاية بعد أو يساوي تاريخ البداية." },
        { status: 400 },
      );
    }

    const id = Number.isInteger(term?.id) ? Number(term.id) : undefined;

    normalized.push({ id, name, startDate, endDate });
  }

  const idsToKeep = normalized
    .map((term) => term.id)
    .filter((id): id is number => typeof id === "number");

  const saved = await prisma.$transaction(async (tx) => {
    if (idsToKeep.length > 0) {
      await tx.term.deleteMany({ where: { id: { notIn: idsToKeep } } });
    } else {
      await tx.term.deleteMany();
    }

    const updated: {
      id: number;
      name: string;
      startDate: Date;
      endDate: Date;
    }[] = [];

    for (const term of normalized) {
      if (term.id) {
        const upserted = await tx.term.upsert({
          where: { id: term.id },
          update: {
            name: term.name,
            startDate: term.startDate,
            endDate: term.endDate,
          },
          create: {
            name: term.name,
            startDate: term.startDate,
            endDate: term.endDate,
          },
        });
        updated.push(upserted);
      } else {
        const created = await tx.term.create({
          data: {
            name: term.name,
            startDate: term.startDate,
            endDate: term.endDate,
          },
        });
        updated.push(created);
      }
    }

    return updated;
  });

  return NextResponse.json({ success: true, terms: formatTerms(saved) });
}
