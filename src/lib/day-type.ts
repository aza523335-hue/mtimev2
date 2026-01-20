import type { Settings, Term } from "@prisma/client";

import { prisma } from "./prisma";

export type TuesdayMode =
  | "FIXED_ON_SITE"
  | "FIXED_REMOTE"
  | "WEEKLY_ALTERNATE"
  | "TERM_WEEK_BASED"
  | "WEEK_NUMBER_BASED"
  | "MANUAL";

export type DayType = "ON_SITE" | "REMOTE";

export const normalizeDayType = (value?: string | null): DayType =>
  value === "REMOTE" ? "REMOTE" : "ON_SITE";

const clampDay = (value: number) => Math.min(6, Math.max(0, value));

const uniqueDays = (days: number[]) => {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const d of days) {
    const day = clampDay(d);
    if (!seen.has(day)) {
      seen.add(day);
      result.push(day);
    }
  }
  return result;
};

export const parseDaysField = (value?: string | null) =>
  value
    ? uniqueDays(
        value
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((n) => !Number.isNaN(n)),
      )
    : [];

export const serializeDaysField = (days: number[]) =>
  uniqueDays(days).join(",");

export const normalizeDayList = (input: unknown): number[] => {
  if (!Array.isArray(input)) return [];
  return uniqueDays(
    input
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
  );
};

export const normalizeTuesdayMode = (value?: string | null): TuesdayMode => {
  const allowed: TuesdayMode[] = [
    "FIXED_ON_SITE",
    "FIXED_REMOTE",
    "WEEKLY_ALTERNATE",
    "TERM_WEEK_BASED",
    "WEEK_NUMBER_BASED",
    "MANUAL",
  ];
  return allowed.includes(value as TuesdayMode)
    ? (value as TuesdayMode)
    : "FIXED_ON_SITE";
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const datePartsInZone = (
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
};

const midnightInZone = (date: Date, timeZone: string) => {
  const parts = datePartsInZone(date, timeZone);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
};

const weeksElapsedSince = (
  startDate: Date,
  now: Date,
  timeZone = "Asia/Riyadh",
) => {
  const start = midnightInZone(startDate, timeZone);
  const today = midnightInZone(now, timeZone);
  const diff = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / WEEK_MS));
};

const findRelevantTermStart = (terms: Term[], now: Date) => {
  if (!terms?.length) return null;
  const sorted = [...terms].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );
  const active = sorted.find(
    (term) => now >= term.startDate && now <= term.endDate,
  );
  if (active) return active.startDate;
  const upcoming = sorted.find((term) => term.startDate > now);
  if (upcoming) return upcoming.startDate;
  return sorted[sorted.length - 1]?.startDate ?? null;
};

export const resolveTuesdayDayType = ({
  mode,
  now = new Date(),
  terms = [],
  defaultType = "ON_SITE",
  oddWeekType = "ON_SITE",
  evenWeekType = "REMOTE",
}: {
  mode?: string | null;
  now?: Date;
  terms?: Term[];
  defaultType?: DayType;
  oddWeekType?: DayType;
  evenWeekType?: DayType;
}): DayType => {
  const normalizedMode = normalizeTuesdayMode(mode);
  const normalizedOdd = normalizeDayType(oddWeekType);
  const normalizedEven = normalizeDayType(evenWeekType);

  if (normalizedMode === "MANUAL") return defaultType;
  if (normalizedMode === "FIXED_REMOTE") return "REMOTE";
  if (normalizedMode === "FIXED_ON_SITE") return "ON_SITE";

  if (normalizedMode === "WEEK_NUMBER_BASED") {
    const termStart = findRelevantTermStart(terms, now);
    if (!termStart) return defaultType;
    const weekNumber = weeksElapsedSince(termStart, now) + 1;
    return weekNumber % 2 === 1 ? normalizedOdd : normalizedEven;
  }

  if (normalizedMode === "WEEKLY_ALTERNATE") {
    const referenceWeek = weeksElapsedSince(
      // Reference Monday near Unix epoch keeps parity stable.
      new Date(Date.UTC(1970, 0, 5)),
      now,
    );
    return referenceWeek % 2 === 0 ? "ON_SITE" : "REMOTE";
  }

  const termStart = findRelevantTermStart(terms, now);
  if (!termStart) return defaultType;

  const weekNumber = weeksElapsedSince(termStart, now) + 1;
  return weekNumber % 2 === 1 ? "ON_SITE" : "REMOTE";
};

export const applyAutoDayType = async (
  settings: Settings | null,
  now = new Date(),
  options?: { terms?: Term[] },
) => {
  if (!settings) return null;
  if (!settings.autoDayTypeEnabled) return settings;

  // احسب اليوم بالتوقيت المحلي للرياض لضمان دقة اليوم الفعلي
  const todayInRiyadh = (() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      timeZone: "Asia/Riyadh",
    });
    const dayName = fmt.format(now).toLowerCase();
    const map: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    return map[dayName] ?? now.getDay();
  })();

  const onSiteDays = parseDaysField(settings.onSiteDays);
  const remoteDays = parseDaysField(settings.remoteDays);

  let desiredType = settings.currentDayType;

  const normalizedTuesdayMode = normalizeTuesdayMode(settings.tuesdayMode);

  if (todayInRiyadh === 2 && normalizedTuesdayMode !== "MANUAL") {
    const terms =
      options?.terms ??
      (await prisma.term.findMany({ orderBy: { startDate: "asc" } }));

    desiredType = resolveTuesdayDayType({
      mode: normalizedTuesdayMode,
      terms,
      now,
      defaultType: normalizeDayType(desiredType),
      oddWeekType: normalizeDayType(settings.tuesdayOddWeekType),
      evenWeekType: normalizeDayType(settings.tuesdayEvenWeekType),
    });
  } else if (
    remoteDays.includes(todayInRiyadh) &&
    !onSiteDays.includes(todayInRiyadh)
  ) {
    desiredType = "REMOTE";
  } else if (
    onSiteDays.includes(todayInRiyadh) &&
    !remoteDays.includes(todayInRiyadh)
  ) {
    desiredType = "ON_SITE";
  }

  if (desiredType === settings.currentDayType) {
    return settings;
  }

  return prisma.settings.update({
    where: { id: settings.id },
    data: { currentDayType: desiredType },
  });
};
