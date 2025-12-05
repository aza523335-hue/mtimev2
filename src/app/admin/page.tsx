import { cookies } from "next/headers";

import { AdminClient } from "@/components/AdminClient";
import { ADMIN_COOKIE_NAME, isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const settings = await prisma.settings.findFirst();

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

  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  const authed = isAdminAuthenticated(session, settings);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminClient
        authed={authed}
        settings={{
          schoolName: settings.schoolName,
          managerName: settings.managerName,
          currentDayType: settings.currentDayType,
        }}
        onSitePeriods={onSitePeriods}
        remotePeriods={remotePeriods}
      />
    </main>
  );
}
