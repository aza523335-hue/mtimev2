import type { Settings } from "@prisma/client";

import { prisma } from "./prisma";

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

export const applyAutoDayType = async (
  settings: Settings | null,
  now = new Date(),
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

  if (remoteDays.includes(todayInRiyadh) && !onSiteDays.includes(todayInRiyadh)) {
    desiredType = "REMOTE";
  } else if (onSiteDays.includes(todayInRiyadh) && !remoteDays.includes(todayInRiyadh)) {
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
