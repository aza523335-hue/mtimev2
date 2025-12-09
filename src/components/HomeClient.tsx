"use client";

import { useEffect, useRef, useState } from "react";

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

export const HomeClient = ({ initialData }: Props) => {
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(() => new Date(initialData.nowIso));
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundHydrated, setSoundHydrated] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPeriodRef = useRef<{ id: number | null; status: "idle" | "current" } | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("period-sound-enabled");
    setSoundEnabled(saved === "true");
    setSoundHydrated(true);
  }, []);

  const ensureAudioContext = () => {
    if (typeof window === "undefined") return null;
    const AudioCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => undefined);
    }

    return audioContextRef.current;
  };

  const playTone = (
    frequency: number,
    durationMs: number,
    offsetSeconds = 0,
    volume = 0.4,
    type: OscillatorType = "sine",
  ) => {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency,
      ctx.currentTime + offsetSeconds,
    );

    const startAt = ctx.currentTime + offsetSeconds;
    const endAt = startAt + durationMs / 1000;

    const level = Math.min(Math.max(volume, 0.01), 0.8);
    gainNode.gain.setValueAtTime(level, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startAt);
    oscillator.stop(endAt);
  };

  const playStartSound = () => {
    // نغمة جهورية قصيرة لبداية الحصة
    playTone(1100, 240, 0, 0.72, "square"); // نبضة قوية
    playTone(820, 240, 0.18, 0.66, "triangle"); // متابعة جهورية قصيرة
  };

  const playEndSound = () => {
    // نغمة جهورية قصيرة لنهاية الحصة
    playTone(880, 240, 0, 0.7, "square"); // نبضة ختامية واضحة
    playTone(640, 240, 0.18, 0.64, "triangle"); // إنهاء مختصر
  };

  useEffect(() => {
    if (!soundHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      "period-sound-enabled",
      soundEnabled ? "true" : "false",
    );

    if (soundEnabled) {
      ensureAudioContext();
    }
  }, [soundEnabled, soundHydrated]);

  useEffect(() => {
    if (!soundEnabled) return;

    const normalized = normalizePeriods(now, data.periods);
    const active = normalized.find(
      (period) => now >= period.start && now < period.end,
    );

    const prev = lastPeriodRef.current;

    if (!prev) {
      lastPeriodRef.current = {
        id: active?.id ?? null,
        status: active ? "current" : "idle",
      };
      return;
    }

    if (prev.status === "current" && (!active || active.id !== prev.id)) {
      playEndSound();
    }

    if (active && prev.id !== active.id) {
      playStartSound();
    }

    lastPeriodRef.current = {
      id: active?.id ?? null,
      status: active ? "current" : "idle",
    };
  }, [now, data.periods, soundEnabled]);

  useEffect(() => {
    if (!soundEnabled) return;
    const normalized = normalizePeriods(new Date(), data.periods);
    const active = normalized.find((period) => {
      const current = new Date();
      return current >= period.start && current < period.end;
    });
    lastPeriodRef.current = {
      id: active?.id ?? null,
      status: active ? "current" : "idle",
    };
  }, [soundEnabled, data.periods]);

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
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-4 shadow-sm md:grid md:grid-cols-4 md:items-center md:justify-items-center md:gap-4">
          <div className="flex justify-center md:justify-start md:col-span-1">
            <span className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm md:text-base lg:text-lg font-bold md:font-extrabold shadow text-center">
              {dayTypeLabel(data.dayType)}
            </span>
          </div>
          <div className="text-sm md:text-lg text-slate-700 md:col-span-1 md:text-center">
            الآن:{" "}
            <span className="font-semibold md:font-bold md:text-xl text-slate-900">
              {new Intl.DateTimeFormat("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "Asia/Riyadh",
              }).format(now)}
            </span>
          </div>
          <div className="md:col-span-1 md:justify-self-center">
            <button
              type="button"
              onClick={() => {
                setSoundEnabled((prev) => !prev);
                ensureAudioContext();
              }}
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition shadow-sm ${soundEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}
              aria-pressed={soundEnabled}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${soundEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                aria-hidden
              />
              تنبيه صوتي للحصص
              <span className="text-[11px] font-normal">
                {soundEnabled ? "مُفعّل" : "متوقف"}
              </span>
            </button>
          </div>
          {dayBounds && (
            <div className="w-full md:col-span-1 md:justify-self-center md:max-w-xs space-y-1">
              <div className="flex items-center justify-between text-xs md:text-sm font-semibold md:font-bold text-slate-700">
                <span
                  className={`text-[11px] md:text-xs ${dayBounds.ended ? "text-red-600" : "text-slate-500"}`}
                >
                  {dayBounds.ended ? "انتهى اليوم الدراسي" : "اليوم الدراسي"}
                </span>
                <span className="md:text-base">
                  المتبقي: {Math.max(0, Math.round(dayBounds.remainingPercent))}%
                </span>
              </div>
              <div className="relative h-2 md:h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner border border-white/80">
                <div
                  className="h-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${dayBounds.remainingPercent}%`,
                    background: "linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)",
                  }}
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

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-5">
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
