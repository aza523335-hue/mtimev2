import { parseTimeInTimeZone } from "@/lib/date-utils";

type Period = {
  id: number;
  order: number;
  startTime: string;
  endTime: string;
  name?: string;
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

const parseTime = (time: string, base: Date) =>
  parseTimeInTimeZone(time, base);

const formatTime12 = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Riyadh",
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const periodRaw = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  const period = periodRaw.toLowerCase() === "am" ? "ص" : "م";

  return `${hour.padStart(2, "0")}:${minute} ${period}`.trim();
};

type Props = {
  period: Period;
  now: Date;
};

export const PeriodCard = ({ period, now }: Props) => {
  const start = parseTime(period.startTime, now);
  const end = parseTime(period.endTime, now);

  let status: "upcoming" | "current" | "done" = "done";
  if (now < start) {
    status = "upcoming";
  } else if (now >= start && now <= end) {
    status = "current";
  }

  const isCurrent = status === "current";
  const isUpcoming = status === "upcoming";

  const countdownTarget = isCurrent ? end : start;
  const countdown = formatCountdown(countdownTarget.getTime() - now.getTime());

  const statusLabel =
    status === "current" ? "جارية الآن" : status === "upcoming" ? "قادمة" : "منتهية";
  const displayName = period.name && period.name.trim().length > 0 ? period.name : `الحصة ${period.order}`;

  const badgeClass =
    status === "current"
      ? "bg-emerald-200 text-emerald-900"
      : status === "upcoming"
        ? "bg-blue-200 text-blue-900"
        : "bg-slate-200 text-slate-700";

  const accent =
    status === "current"
      ? "bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-[0_18px_40px_-16px_rgba(16,185,129,0.45)] ring-1 ring-emerald-200/70"
      : status === "upcoming"
        ? "bg-gradient-to-br from-sky-100 via-blue-100 to-blue-200 border border-blue-300 text-blue-950 shadow-[0_16px_36px_-16px_rgba(59,130,246,0.4)] ring-1 ring-blue-300/80"
        : "bg-slate-100/80 border border-slate-200 text-slate-700 shadow-[0_12px_28px_-18px_rgba(148,163,184,0.35)] ring-1 ring-slate-200/70";

  const displayStart = formatTime12(start);
  const displayEnd = formatTime12(end);
  const totalMs = Math.max(1, end.getTime() - start.getTime());
  const progressPercent = isCurrent
    ? Math.min(100, Math.max(0, ((end.getTime() - now.getTime()) / totalMs) * 100))
    : isUpcoming
      ? 0
      : 100;
  const progressColor =
    status === "current"
      ? "rgba(16, 185, 129, 0.9)"
      : status === "upcoming"
        ? "rgba(59, 130, 246, 0.85)"
        : "rgba(148, 163, 184, 0.9)";
  const trackColor =
    status === "current"
      ? "rgba(71, 85, 105, 0.4)"
      : status === "upcoming"
        ? "rgba(148, 163, 184, 0.22)"
        : "rgba(148, 163, 184, 0.28)";
  const gapPercent = 100 - progressPercent;

  return (
    <div
      className={`relative w-[calc(100%+1mm)] -mx-[0.5mm] sm:w-auto sm:mx-0 overflow-hidden rounded-3xl border p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 transition transform hover:-translate-y-1 hover:shadow-2xl ${accent}`}
    >
      {isCurrent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.18),transparent_60%)]"
        />
      )}
      <div className="flex items-center justify-center">
        <span className="text-center text-xs sm:text-sm md:text-lg font-semibold md:font-bold">
          {displayName}
        </span>
      </div>

      <div className="relative mx-auto flex h-32 w-32 sm:h-36 sm:w-36 md:h-44 md:w-44 items-center justify-center [--ring-thickness:6px] sm:[--ring-thickness:8px] md:[--ring-thickness:10px] [--dot-size:4px] sm:[--dot-size:5px]">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, ${trackColor} 0% ${gapPercent}%, ${progressColor} ${gapPercent}% 100%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-[var(--ring-thickness)] rounded-full bg-white/90 shadow-inner"
        />
        <span
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/70 h-[var(--dot-size)] w-[var(--dot-size)]"
          style={{ top: "calc((var(--ring-thickness) - var(--dot-size)) / 2)" }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 rounded-full bg-black/70 h-[var(--dot-size)] w-[var(--dot-size)]"
          style={{ right: "calc((var(--ring-thickness) - var(--dot-size)) / 2)" }}
        />
        <span
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/70 h-[var(--dot-size)] w-[var(--dot-size)]"
          style={{ bottom: "calc((var(--ring-thickness) - var(--dot-size)) / 2)" }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 rounded-full bg-black/70 h-[var(--dot-size)] w-[var(--dot-size)]"
          style={{ left: "calc((var(--ring-thickness) - var(--dot-size)) / 2)" }}
        />
        <div className="relative z-10 text-center text-slate-700">
          <div className="text-[10px] sm:text-xs font-semibold text-slate-500">{statusLabel}</div>
          {isCurrent && (
            <>
              <div className="mt-1 text-[11px] sm:text-sm font-semibold text-emerald-700">ينتهي خلال</div>
              <div className="text-base sm:text-lg font-bold tracking-wide tabular-nums text-slate-900">
                {countdown}
              </div>
            </>
          )}
          {isUpcoming && (
            <>
              <div className="mt-1 text-[11px] sm:text-sm font-semibold text-blue-700">يبدأ خلال</div>
              <div className="text-base sm:text-lg font-bold tracking-wide tabular-nums text-slate-900">
                {countdown}
              </div>
            </>
          )}
          {!isCurrent && !isUpcoming && (
            <>
              <div className="mt-1 text-[11px] sm:text-sm font-semibold text-red-600">انتهت</div>
              <div className="text-base sm:text-lg font-bold tracking-wide tabular-nums text-slate-400">
                00:00:00
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-slate-600 text-[11px] sm:text-sm md:text-base font-semibold">
        <span className="text-right whitespace-nowrap">
          <span className="sm:hidden">بداية{displayStart.replace(" ", "")}</span>
          <span className="hidden sm:inline">بداية: {displayStart}</span>
        </span>
        <span className="text-left">نهاية: {displayEnd}</span>
      </div>
    </div>
  );
};
