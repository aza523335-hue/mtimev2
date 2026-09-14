"use client";

import { useCallback, useEffect, useState } from "react";

import { dayTypeLabel, parseTimeInTimeZone } from "@/lib/date-utils";
import { type TermStatus } from "@/lib/terms";

import { HeaderCard } from "./HeaderCard";
import { PeriodCard } from "./PeriodCard";

type Period = {
  id: number;
  order: number;
  dayType: string;
  name?: string;
  startTime: string;
  endTime: string;
};

type PeriodsPayload = {
  dayType: string;
  periods: Period[];
  header: {
    schoolName: string;
    managerName: string;
  };
  gregorianDate: string;
  hijriDate: string;
  gregorianMonthNumber: number;
  hijriMonthNumber: number;
  nowIso: string;
   termStatus?: TermStatus | null;
};

type Props = {
  initialData: PeriodsPayload;
};

const parseTimeForDate = (time: string, baseDate: Date) =>
  parseTimeInTimeZone(time, baseDate);

const normalizePeriods = (baseDate: Date, periods: Period[]) => {
  const dayMs = 24 * 60 * 60 * 1000;
  let prevEnd: Date | null = null;

  return periods.map((period) => {
    let start = parseTimeForDate(period.startTime, baseDate);
    let end = parseTimeForDate(period.endTime, baseDate);

    if (prevEnd && start < prevEnd) {
      start = new Date(start.getTime() + dayMs);
      end = new Date(end.getTime() + dayMs);
    }

    while (end <= start) {
      end = new Date(end.getTime() + dayMs);
    }

    prevEnd = end;

    return { ...period, start, end };
  });
};

const describeTermStatus = (term: TermStatus) => {
  if (term.status === "upcoming") {
    const days = term.daysUntilStart ?? term.remainingDays;
    return `يبدأ خلال ${Math.max(0, days)} يوم`;
  }

  if (term.status === "finished") {
    return "انتهى هذا الترم";
  }

  return `المتبقي ${Math.max(0, term.remainingDays)} يوم`;
};

export const HomeClient = ({ initialData }: Props) => {
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(() => new Date(initialData.nowIso));
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/periods", { cache: "no-store" });
      if (res.ok) {
        const payload = (await res.json()) as PeriodsPayload;
        setData(payload);
        setError(null);
      } else {
        setError("تعذر تحديث البيانات مؤقتاً");
      }
    } catch {
      setError("تعذر تحديث البيانات مؤقتاً");
    }
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLatest();
    const interval = setInterval(fetchLatest, 12000);

    return () => clearInterval(interval);
  }, [fetchLatest]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("mtime-updates");
    const handleMessage = (event: MessageEvent) => {
      if (event?.data?.type === "settings-updated") {
        fetchLatest();
      }
    };
    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [fetchLatest]);

  const dayBounds = (() => {
    if (!data.periods.length) return null;

    const buildTotals = (baseDate: Date) => {
      let prevEnd: Date | null = null;
      let firstStart: Date | null = null;
      let lastEnd: Date | null = null;
      let totalMs = 0;
      let remainingMs = 0;
      const dayMs = 24 * 60 * 60 * 1000;

      for (const period of data.periods) {
        let start = parseTimeForDate(period.startTime, baseDate);
        let end = parseTimeForDate(period.endTime, baseDate);

        if (prevEnd && start < prevEnd) {
          start = new Date(start.getTime() + dayMs);
          end = new Date(end.getTime() + dayMs);
        }

        while (end <= start) {
          end = new Date(end.getTime() + dayMs);
        }

        const duration = Math.max(0, end.getTime() - start.getTime());
        totalMs += duration;

        if (!firstStart) firstStart = start;
        lastEnd = end;
        prevEnd = end;

        if (now < start) {
          remainingMs += duration;
        } else if (now >= start && now < end) {
          remainingMs += Math.max(0, end.getTime() - now.getTime());
        }
      }

      return {
        totalMs,
        remainingMs,
        start: firstStart,
        end: lastEnd,
      };
    };

    const candidates = [
      buildTotals(now),
      buildTotals(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    ].filter((c) => c.start && c.end) as {
      totalMs: number;
      remainingMs: number;
      start: Date;
      end: Date;
    }[];

    if (!candidates.length) return null;

    const containing = candidates.find(
      (c) => now >= c.start && now <= c.end,
    );

    const nextEnding = candidates
      .filter((c) => c.end > now)
      .sort((a, b) => a.end.getTime() - b.end.getTime())[0];

    const chosen = containing ?? nextEnding ?? candidates[0];

    const remainingPercent =
      chosen.totalMs === 0 ? 0 : (chosen.remainingMs / chosen.totalMs) * 100;

    return {
      remainingPercent,
      ended: chosen.remainingMs <= 0,
    };
  })();
  const todayPeriods = normalizePeriods(now, data.periods);
  const completedCount = todayPeriods.filter((period) => now >= period.end).length;
  const allCompleted = todayPeriods.length > 0 && completedCount === todayPeriods.length;
  const visiblePeriods = showCompleted
    ? todayPeriods
    : todayPeriods.filter((period) => now < period.end);

  const termWeekNumber = (() => {
    if (!data.termStatus) return null;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const termStart = new Date(data.termStatus.startDate);
    const weeksSinceStart = Math.floor((now.getTime() - termStart.getTime()) / weekMs) + 1;
    return Math.max(1, weeksSinceStart);
  })();

  return (
    <div className="space-y-6">
      <div className="space-y-2 sm:space-y-4">
        <HeaderCard
          schoolName={data.header.schoolName}
          managerName={data.header.managerName}
          gregorianDate={data.gregorianDate}
          hijriDate={data.hijriDate}
        />
        <div className="flex flex-col gap-2 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-3 sm:p-4 shadow-sm">
          {data.termStatus ? (
            <div className="sm:rounded-xl sm:border sm:border-slate-200 sm:bg-white/70 sm:p-2.5 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 text-sm font-bold text-slate-900">
                  {data.termStatus.name}
                </h3>
                {termWeekNumber !== null ? (
                  <span className="shrink-0 whitespace-nowrap sm:flex-1 sm:text-center text-xs sm:text-[11px] font-semibold text-slate-500">
                    الأسبوع {termWeekNumber}
                  </span>
                ) : null}
                <span
                  className={`hidden sm:inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
                    data.termStatus.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : data.termStatus.status === "upcoming"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {describeTermStatus(data.termStatus)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs sm:text-[11px] font-semibold text-slate-600">
                  <span className="min-w-0">
                    <span className={data.termStatus.status === "active" ? "" : "hidden sm:inline"}>
                      متبقي: {Math.max(0, data.termStatus.remainingDays)} من{" "}
                      {Math.max(1, data.termStatus.totalDays)} يوم
                    </span>
                    {data.termStatus.status !== "active" && (
                      <span className="sm:hidden">{describeTermStatus(data.termStatus)}</span>
                    )}
                  </span>
                  <span className="text-slate-800 whitespace-nowrap">
                    {Math.max(0, Math.round(data.termStatus.remainingPercent))}%
                  </span>
                </div>
                <div className="relative h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                  <div
                    className="h-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, Math.round(data.termStatus.remainingPercent)),
                      )}%`,
                      background:
                        "linear-gradient(90deg, #22c55e 0%, #f97316 50%, #ef4444 100%)",
                    }}
                    aria-label="شريط تقدم الترم الدراسي"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-slate-200 [&:not(:first-child)]:border-t [&:not(:first-child)]:pt-2 sm:[&:not(:first-child)]:pt-4 sm:gap-x-4 sm:gap-y-3 sm:rounded-xl sm:bg-indigo-50/70 sm:border sm:border-indigo-100 sm:p-4">
            <div className="col-span-2 flex items-baseline justify-center gap-2 text-slate-800">
              <span className="text-[10px] text-slate-500 sm:text-xs">الآن</span>
              <span className="whitespace-nowrap text-base font-bold tabular-nums text-slate-900 sm:text-lg lg:text-xl">
                {new Intl.DateTimeFormat("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                  timeZone: "Asia/Riyadh",
                }).format(now)}
              </span>
            </div>

            <span className="whitespace-nowrap rounded-lg bg-indigo-600 px-2.5 py-1 text-sm font-bold text-white shadow sm:rounded-xl sm:px-4 sm:py-2 lg:text-base">
              {dayTypeLabel(data.dayType)}
            </span>

            {dayBounds && (
              <div className="min-w-0 space-y-1 sm:space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] font-semibold sm:text-xs lg:text-sm">
                  <span className={dayBounds.ended ? "text-emerald-700" : "text-slate-500"}>
                    {dayBounds.ended ? "انتهى اليوم الدراسي" : "اليوم الدراسي"}
                  </span>
                  <span className="whitespace-nowrap text-slate-800">
                    المتبقي: {Math.max(0, Math.round(dayBounds.remainingPercent))}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="المتبقي من اليوم الدراسي"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.max(0, Math.min(100, Math.round(dayBounds.remainingPercent)))}
                  className="relative h-1.5 w-full overflow-hidden rounded-full border border-white/80 bg-slate-200/80 shadow-inner sm:h-2 lg:h-2.5"
                >
                  <div
                    className="h-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${dayBounds.remainingPercent}%`,
                      background: "linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg p-3 shadow-sm">
          {error}
        </div>
      )}

      {completedCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowCompleted((previous) => !previous)}
            aria-pressed={showCompleted}
            aria-controls="period-cards"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            {showCompleted ? "إخفاء الحصص المنتهية" : `إظهار الحصص المنتهية (${completedCount})`}
          </button>
        </div>
      )}

      <div role="status" className="text-center text-slate-700">
        {allCompleted && (
          <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white px-6 py-5 shadow-sm sm:py-14">
            <div
              aria-hidden="true"
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm ring-4 ring-emerald-100/60 sm:mb-5 sm:h-20 sm:w-20 sm:ring-8"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 sm:h-10 sm:w-10"
              >
                <path d="M20 11.1V12a8 8 0 1 1-4.7-7.3" />
                <path d="m8 11 4 4 8-9" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-emerald-950 sm:text-2xl">
              انتهت حصص اليوم
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 sm:mt-2 sm:text-base sm:leading-7">
              شكرًا لعطائكم، نتمنى لكم بقية يوم جميلة
            </p>
          </div>
        )}
        {todayPeriods.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-5">لا توجد حصص في جدول هذا اليوم</p>
        )}
      </div>

      <div id="period-cards" className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-y-[2mm] gap-x-[3mm] sm:gap-5">
        {visiblePeriods.map((period) => (
          <PeriodCard
            key={`${period.dayType}-${period.order}`}
            period={period}
            start={period.start}
            end={period.end}
            now={now}
          />
        ))}
      </div>
    </div>
  );
};
