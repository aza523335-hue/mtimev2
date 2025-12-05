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

const parseTime = (time: string) => {
  const [hour = "0", minute = "0"] = time.split(":");
  const base = new Date();
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    Number(hour),
    Number(minute),
  );
};

type Props = {
  period: Period;
  now: Date;
};

export const PeriodCard = ({ period, now }: Props) => {
  const start = parseTime(period.startTime);
  const end = parseTime(period.endTime);

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
      ? "bg-emerald-100 border-2 border-emerald-300 text-emerald-900 shadow-[0_18px_45px_-18px_rgba(16,185,129,0.5)] ring-2 ring-emerald-200/60"
      : status === "upcoming"
        ? "bg-blue-100 border-2 border-blue-300 text-blue-900"
        : "bg-slate-100 border-2 border-slate-300 text-slate-800";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 space-y-3 transition transform hover:-translate-y-1 hover:shadow-2xl ${accent}`}
    >
      {isCurrent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.35),transparent_55%)] animate-pulse"
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {displayName}
        </span>
        <span className={`text-xs px-3 py-1 rounded-full ${badgeClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center justify-between text-slate-600 text-sm">
        <span>البداية: {period.startTime}</span>
        <span>النهاية: {period.endTime}</span>
      </div>

      {isCurrent && (
        <div className="text-center text-emerald-700 font-semibold">
          ينتهي خلال: <span className="font-bold">{countdown}</span>
        </div>
      )}

      {isUpcoming && (
        <div className="text-center text-amber-700 font-semibold">
          يبدأ خلال: <span className="font-bold">{countdown}</span>
        </div>
      )}

      {!isCurrent && !isUpcoming && (
        <div className="text-center text-slate-500 text-sm">انتهت</div>
      )}
    </div>
  );
};
