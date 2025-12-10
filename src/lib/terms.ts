const DAY_MS = 24 * 60 * 60 * 1000;

export type TermRecord = {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
};

export type TermStatus = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: "active" | "upcoming" | "finished";
  totalDays: number;
  remainingDays: number;
  remainingPercent: number;
  daysUntilStart?: number;
};

export const computeTermStatus = (
  terms: TermRecord[],
  now: Date = new Date(),
): TermStatus | null => {
  if (!terms?.length) return null;

  const sorted = [...terms].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );

  const active = sorted.find(
    (term) => now >= term.startDate && now <= term.endDate,
  );
  const upcoming = sorted.find((term) => term.startDate > now);
  const fallback = sorted[sorted.length - 1];

  const selected = active ?? upcoming ?? fallback;

  let status: TermStatus["status"] = "finished";
  if (now < selected.startDate) status = "upcoming";
  else if (now <= selected.endDate) status = "active";

  const totalMs = Math.max(
    0,
    selected.endDate.getTime() - selected.startDate.getTime(),
  );
  const remainingMs =
    status === "upcoming"
      ? totalMs
      : Math.max(0, selected.endDate.getTime() - now.getTime());
  const totalDays = Math.max(1, Math.round(totalMs / DAY_MS));
  const remainingDays = Math.max(0, Math.ceil(remainingMs / DAY_MS));

  const remainingPercent =
    totalMs === 0
      ? 0
      : Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

  const daysUntilStart =
    status === "upcoming"
      ? Math.max(
          0,
          Math.ceil((selected.startDate.getTime() - now.getTime()) / DAY_MS),
        )
      : undefined;

  return {
    id: selected.id,
    name: selected.name,
    startDate: selected.startDate.toISOString(),
    endDate: selected.endDate.toISOString(),
    status,
    totalDays,
    remainingDays,
    remainingPercent,
    daysUntilStart,
  };
};
