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
      ? "bg-emerald-200 border-2 border-emerald-400 text-emerald-900 shadow-[0_18px_45px_-18px_rgba(16,185,129,0.55)] ring-2 ring-emerald-300/70"
      : status === "upcoming"
        ? "bg-blue-200 border-2 border-blue-400 text-blue-900"
        : "bg-slate-200 border-2 border-slate-400 text-slate-800";

  const displayStart = formatTime12(start);
  const displayEnd = formatTime12(end);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 md:p-5 space-y-3 transition transform hover:-translate-y-1 hover:shadow-2xl ${accent}`}
    >
      {isCurrent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.35),transparent_55%)] animate-pulse"
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm md:text-lg font-semibold md:font-bold">
          {displayName}
        </span>
        <span className={`text-xs md:text-sm lg:text-base px-3 py-1 rounded-full font-semibold md:font-bold ${badgeClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center justify-between text-slate-600 text-sm md:text-lg font-normal md:font-semibold">
        <span>البداية: {displayStart}</span>
        <span>النهاية: {displayEnd}</span>
      </div>

      {isCurrent && (
        <div className="text-center text-emerald-700 font-semibold md:font-bold md:text-xl">
          ينتهي خلال: <span className="font-bold">{countdown}</span>
        </div>
      )}

      {isUpcoming && (
        <div className="text-center text-amber-700 font-semibold md:font-bold md:text-xl">
          يبدأ خلال: <span className="font-bold">{countdown}</span>
        </div>
      )}

      {!isCurrent && !isUpcoming && (
        <div className="text-center text-slate-500 text-sm md:text-lg font-normal md:font-semibold">انتهت</div>
      )}
    </div>
  );
};
