import { cookies } from "next/headers";

import { AdminClient } from "@/components/AdminClient";
import { ADMIN_COOKIE_NAME, isAdminAuthenticated } from "@/lib/auth";
import { applyAutoDayType, parseDaysField } from "@/lib/day-type";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const settings = await applyAutoDayType(
    await prisma.settings.findFirst(),
    new Date(),
  );

  if (!settings) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm border border-slate-200">
          <p className="text-lg font-semibold text-slate-700">
            لم يتم تجهيز قاعدة البيانات. شغّل أمر seeding أولاً.
          </p>
        </div>
      </main>
    );
  }

  const onSitePeriods = await prisma.period.findMany({
    where: { dayType: "ON_SITE" },
    orderBy: { order: "asc" },
  });

  const remotePeriods = await prisma.period.findMany({
    where: { dayType: "REMOTE" },
    orderBy: { order: "asc" },
  });

  const terms = await prisma.term.findMany({ orderBy: { startDate: "asc" } });

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  const authed = isAdminAuthenticated(session, settings);
  const adminSettings = {
    schoolName: settings.schoolName,
    managerName: settings.managerName,
    currentDayType: settings.currentDayType,
    autoDayTypeEnabled: settings.autoDayTypeEnabled,
    onSiteDays: parseDaysField(settings.onSiteDays),
    remoteDays: parseDaysField(settings.remoteDays),
  } as const;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminClient
        authed={authed}
        settings={adminSettings}
        onSitePeriods={onSitePeriods}
        remotePeriods={remotePeriods}
        terms={terms.map((term) => ({
          id: term.id,
          name: term.name,
          startDate: term.startDate.toISOString().split("T")[0],
          endDate: term.endDate.toISOString().split("T")[0],
        }))}
      />
    </main>
  );
}
