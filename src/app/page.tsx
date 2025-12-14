import { HomeClient } from "@/components/HomeClient";
import { getDateInfo } from "@/lib/date-utils";
import { applyAutoDayType } from "@/lib/day-type";
import { prisma } from "@/lib/prisma";
import { computeTermStatus } from "@/lib/terms";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const terms = await prisma.term.findMany({ orderBy: { startDate: "asc" } });
  const settings = await applyAutoDayType(
    await prisma.settings.findFirst(),
    now,
    { terms },
  );

  if (!settings) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm border border-slate-200">
          <p className="text-lg font-semibold text-slate-700">
            لم يتم تجهيز قاعدة البيانات. شغّل أمر seeding أولاً.
          </p>
        </div>
      </main>
    );
  }

  const periods = await prisma.period.findMany({
    where: { dayType: settings.currentDayType },
    orderBy: { order: "asc" },
  });

  const termStatus = computeTermStatus(terms, now);

  const dates = getDateInfo(now);

  return (
    <main className="w-full max-w-full px-4 py-8 space-y-6 lg:px-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">جدول الحصص اليومية</p>
          <h1 className="text-2xl font-bold text-slate-800">الجدول الزمني</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>متصل بالتزامن</span>
          <a
            href="/admin"
            className="rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-semibold hover:bg-slate-800 transition"
          >
            لوحة المدير
          </a>
        </div>
      </header>

      <HomeClient
        initialData={{
          dayType: settings.currentDayType,
          periods,
          header: {
            schoolName: settings.schoolName,
            managerName: settings.managerName,
          },
          gregorianDate: dates.gregorianDate,
          hijriDate: dates.hijriDate,
          gregorianMonthNumber: dates.gregorianMonthNumber,
          hijriMonthNumber: dates.hijriMonthNumber,
          nowIso: now.toISOString(),
          termStatus,
        }}
      />
    </main>
  );
}
