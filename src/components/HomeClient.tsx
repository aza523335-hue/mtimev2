"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [soundHydrated, setSoundHydrated] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPeriodRef = useRef<{ id: number | null; status: "idle" | "current" } | null>(null);

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

  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined" || !soundUnlocked) return null;
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
  }, [soundUnlocked]);

  const unlockAudioContext = useCallback(() => {
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

    if (!soundUnlocked) {
      setSoundUnlocked(true);
    }

    return audioContextRef.current;
  }, [soundUnlocked]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("period-sound-enabled");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundEnabled(saved === "true");
    setSoundHydrated(true);
  }, []);

  const playTone = useCallback(
    (
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
    },
    [ensureAudioContext],
  );

  const playStartSound = useCallback(() => {
    // نغمة جرس تقليدية لبداية الحصة
    playTone(1200, 620, 0, 0.78, "sine"); // ضربة الجرس
    playTone(900, 680, 0.04, 0.68, "triangle"); // ارتداد خفيف
    playTone(600, 540, 0.12, 0.5, "sine"); // ذيل الجرس
  }, [playTone]);

  const playEndSound = useCallback(() => {
    // نغمة نهاية مختلفة وواضحة (نزول حاد) عن بداية الحصة
    playTone(520, 520, 0, 0.7, "square"); // نبضة منخفضة
    playTone(400, 480, 0.1, 0.6, "triangle"); // نزول أوضح
    playTone(300, 360, 0.18, 0.5, "sine"); // تذييل عميق
  }, [playTone]);

  useEffect(() => {
    if (!soundHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      "period-sound-enabled",
      soundEnabled ? "true" : "false",
    );
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
  }, [now, data.periods, soundEnabled, playEndSound, playStartSound]);

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
      <div className="space-y-4">
        <HeaderCard
          schoolName={data.header.schoolName}
          managerName={data.header.managerName}
          gregorianDate={data.gregorianDate}
          hijriDate={data.hijriDate}
        />
        <div className="flex flex-col gap-2 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200 p-3 sm:p-4 shadow-sm">
          {data.termStatus ? (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-2 sm:p-2.5 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {data.termStatus.name}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
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
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span className="truncate">
                    متبقي: {Math.max(0, data.termStatus.remainingDays)} من{" "}
                    {Math.max(1, data.termStatus.totalDays)} يوم
                  </span>
                  <span className="text-slate-800 whitespace-nowrap">
                    {Math.max(0, Math.round(data.termStatus.remainingPercent))}%
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
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

          <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-3 sm:p-4 space-y-2 sm:space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <span className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm lg:text-base font-bold shadow">
                {dayTypeLabel(data.dayType)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSoundEnabled((prev) => !prev);
                  unlockAudioContext();
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
              <div className="w-full space-y-1">
                <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-3 justify-items-start sm:justify-items-stretch items-center gap-2 text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-700">
                  <span
                    className={`text-[11px] lg:text-xs whitespace-nowrap ${dayBounds.ended ? "text-red-600" : "text-slate-500"}`}
                  >
                    {dayBounds.ended ? "انتهى اليوم الدراسي" : "اليوم الدراسي"}
                  </span>
                  <div className="text-center text-slate-800 whitespace-nowrap">
                    <span className="text-[10px] sm:text-xs text-slate-500 mr-1">
                      الآن
                    </span>
                    <span className="font-bold text-base sm:text-lg lg:text-xl text-slate-900">
                      {new Intl.DateTimeFormat("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Riyadh",
                      }).format(now)}
                    </span>
                  </div>
                  <span className="lg:text-base justify-self-start text-left sm:text-right sm:justify-self-end whitespace-nowrap text-slate-800 pl-1">
                    المتبقي: {Math.max(0, Math.round(dayBounds.remainingPercent))}%
                  </span>
                </div>
                <div className="relative h-2 lg:h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 shadow-inner border border-white/80">
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
