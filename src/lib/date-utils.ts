import HijriDateExport, { toHijri } from "hijri-date/lib/safe";
import { formatDateParts } from "./date-format";

const HijriDate =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HijriDateExport as any).default || (HijriDateExport as any);
const defaultTimeZone = "Asia/Riyadh";

export const getDateInfo = (now: Date = new Date()) => {
  const dateParts = (calendar: string) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      calendar, numberingSystem: "latn", timeZone: defaultTimeZone,
      day: "2-digit", month: "2-digit", year: "numeric",
    }).formatToParts(now);
    const value = (type: string) => parts.find((part) => part.type === type)!.value;
    return { date: formatDateParts(value("day"), value("month"), value("year")), month: Number(value("month")) };
  };
  const gregorian = dateParts("gregory");
  let hijri;
  try {
    hijri = dateParts("islamic-umalqura");
  } catch {
    const hijriObj = toHijri ? toHijri(now) : new HijriDate(now);
    const month = hijriObj.getMonth() + 1;
    hijri = { date: formatDateParts(hijriObj.getDate(), month, hijriObj.getFullYear()), month };
  }
  return { gregorianDate: gregorian.date, hijriDate: hijri.date,
    gregorianMonthNumber: gregorian.month, hijriMonthNumber: hijri.month };
};

export const dayTypeLabel = (dayType: string) =>
  dayType === "REMOTE" ? "عن بعد" : "حضوري";

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const utcEquivalent = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return utcEquivalent - date.getTime();
};

const getDatePartsInZone = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
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

export const parseTimeInTimeZone = (
  time: string,
  baseDate: Date,
  timeZone = defaultTimeZone,
) => {
  const [hour = "0", minute = "0"] = time.split(":");
  const offsetMs = getTimeZoneOffsetMs(baseDate, timeZone);
  const parts = getDatePartsInZone(baseDate, timeZone);

  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(hour),
      Number(minute),
    ) - offsetMs,
  );
};

export const TARGET_TIME_ZONE = defaultTimeZone;
