export type ScheduleMode = "ON_SITE" | "REMOTE" | "AUTO";
export type ScheduleDayType = "ON_SITE" | "REMOTE";
const DAY_MS = 86400000;

export const riyadhDate = (now: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const isTuesdayDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getUTCDay() === 2;
};

export const upcomingTuesdays = (now: Date, count = 4) => {
  const today = new Date(`${riyadhDate(now)}T00:00:00Z`);
  const offset = (2 - today.getUTCDay() + 7) % 7;
  return Array.from({ length: count }, (_, i) =>
    new Date(today.getTime() + (offset + i * 7) * DAY_MS).toISOString().slice(0, 10));
};

export const alternatingTuesday = (
  date: string, reference: string, referenceType: ScheduleDayType,
): ScheduleDayType => {
  // Signed differences also support reference dates in the future.
  const weeks = Math.floor((Date.parse(date) - Date.parse(reference)) / (7 * DAY_MS));
  return weeks % 2 === 0 ? referenceType : referenceType === "REMOTE" ? "ON_SITE" : "REMOTE";
};

export const resolveSchedule = (settings: {
  scheduleMode: string | null;
  tuesdayReferenceDate: string | null;
  tuesdayReferenceType: string;
  remoteDays: string;
  currentDayType: string;
}, now: Date): string => {
  if (settings.scheduleMode === "ON_SITE" || settings.scheduleMode === "REMOTE") return settings.scheduleMode;
  const date = riyadhDate(now);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (day === 2) {
    if (!isTuesdayDate(settings.tuesdayReferenceDate)) return settings.currentDayType;
    return alternatingTuesday(date, settings.tuesdayReferenceDate,
      settings.tuesdayReferenceType === "REMOTE" ? "REMOTE" : "ON_SITE");
  }
  return settings.remoteDays.split(",").filter(Boolean).map(Number).includes(day) ? "REMOTE" : "ON_SITE";
};
