"use client";

import { useEffect, useState } from "react";

import { dayTypeLabel } from "@/lib/date-utils";

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
};

type Props = {
  initialData: PeriodsPayload;
};

const parseTimeForDate = (time: string, baseDate: Date) => {
  const [hour = "0", minute = "0"] = time.split(":");
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    Number(hour),
    Number(minute),
  );
};

export const HomeClient = ({ initialData }: Props) => {
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(() => new Date(initialData.nowIso));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
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
    }, 12000);

    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <HeaderCard
          schoolName={data.header.schoolName}
          managerName={data.header.managerName}
          gregorianDate={data.gregorianDate}
          hijriDate={data.hijriDate}
          gregorianMonthNumber={data.gregorianMonthNumber}
          hijriMonthNumber={data.hijriMonthNumber}
        />
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-4 shadow-sm md:flex-row md:justify-between">
          <div className="w-full flex justify-center md:justify-center">
            <span className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow text-center">
              {dayTypeLabel(data.dayType)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>تحديث تلقائي كل 12 ثانية</span>
          </div>
          <div className="text-sm text-slate-600">
            الآن: <span className="font-semibold text-slate-800">{now.toLocaleTimeString("ar-EG")}</span>
          </div>
          {dayBounds && (
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span
                  className={`text-[11px] ${dayBounds.ended ? "text-red-600" : "text-slate-500"}`}
                >
                  {dayBounds.ended ? "انتهى اليوم الدراسي" : "اليوم الدراسي"}
                </span>
                <span>المتبقي: {Math.max(0, Math.round(dayBounds.remainingPercent))}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/60 shadow-inner border border-white/80">
                <div
                  className="h-full bg-gradient-to-l from-emerald-500 via-indigo-500 to-amber-400 transition-[width] duration-700 ease-out"
                  style={{ width: `${dayBounds.remainingPercent}%` }}
                  aria-label="شريط تقدم اليوم الدراسي"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg p-3 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {data.periods.map((period) => (
          <PeriodCard
            key={`${period.dayType}-${period.order}`}
            period={period}
            now={now}
          />
        ))}
      </div>
    </div>
  );
};
