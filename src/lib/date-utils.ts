import HijriDateExport, { toHijri } from "hijri-date/lib/safe";

const HijriDate =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HijriDateExport as any).default || (HijriDateExport as any);

const pad = (value: number) => value.toString().padStart(2, "0");
const toEnglishDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const parseLocalizedNumber = (value: string) => {
  const easternToWestern = (char: string) => {
    const code = char.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    if (code >= 0x06F0 && code <= 0x06F9) return String(code - 0x06F0);
    return char;
  };
  const normalized = value
    .split("")
    .map(easternToWestern)
    .join("")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

export const getDateInfo = (now: Date = new Date()) => {
  const hijriLocale = "ar-SA-u-ca-islamic-umalqura";
  const formatOrderedDate = (
    date: Date,
    locale: string,
    monthNumber: number,
    options: Intl.DateTimeFormatOptions,
  ) => {
    const parts = new Intl.DateTimeFormat(locale, options)
      .formatToParts(date)
      .reduce<Record<string, string>>((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      }, {});

    const weekday = parts.weekday ?? "";
    const day = parts.day ?? "";
    const monthName = parts.month ?? "";
    const year = parts.year ?? "";

    const dayEn = toEnglishDigits(day);
    const monthNumberEn = toEnglishDigits(String(monthNumber));
    const yearEn = toEnglishDigits(year);

    return `${weekday} ${dayEn} ${monthName} (${monthNumberEn}) ${yearEn}`;
  };

  const gregorianMonthNumber =
    parseLocalizedNumber(
      now.toLocaleString("ar-EG", {
        month: "numeric",
        timeZone: "Asia/Riyadh",
      }),
    ) ?? now.getMonth() + 1;

  let gregorianDate: string;
  try {
    gregorianDate = formatOrderedDate(
      now,
      "ar-EG",
      gregorianMonthNumber,
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
        timeZone: "Asia/Riyadh",
      },
    );
  } catch {
    const weekday = now.toLocaleString("ar-EG", {
      weekday: "long",
      timeZone: "Asia/Riyadh",
    });
    const day = toEnglishDigits(
      now.toLocaleString("ar-EG", { day: "2-digit", timeZone: "Asia/Riyadh" }),
    );
    const monthName = now.toLocaleString("ar-EG", {
      month: "long",
      timeZone: "Asia/Riyadh",
    });
    const year = toEnglishDigits(
      now.toLocaleString("ar-EG", { year: "numeric", timeZone: "Asia/Riyadh" }),
    );
    gregorianDate = `${weekday} ${day} ${monthName} (${toEnglishDigits(String(gregorianMonthNumber))}) ${year}`;
  }

  let hijriDate: string;
  let hijriMonthNumber: number;
  try {
    const parsedHijriMonth = parseLocalizedNumber(
      new Intl.DateTimeFormat(hijriLocale, {
        month: "numeric",
        timeZone: "Asia/Riyadh",
      }).format(now),
    );

    hijriMonthNumber =
      parsedHijriMonth ??
      (toHijri ? (toHijri(now).getMonth?.() ?? 0) + 1 : 1);

    hijriDate = formatOrderedDate(
      now,
      hijriLocale,
      hijriMonthNumber,
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
        timeZone: "Asia/Riyadh",
      },
    );
  } catch {
    const hijriObj = toHijri ? toHijri(now) : new HijriDate(now);
    hijriMonthNumber = hijriObj.getMonth() + 1;
    const hijriWeekdays = [
      "الأحد",
      "الاثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
    const hijriMonths = [
      "محرم",
      "صفر",
      "ربيع الأول",
      "ربيع الآخر",
      "جمادى الأولى",
      "جمادى الآخرة",
      "رجب",
      "شعبان",
      "رمضان",
      "شوال",
      "ذو القعدة",
      "ذو الحجة",
    ];
    const weekday = hijriWeekdays[hijriObj.getDay()] ?? "";
    const day = toEnglishDigits(pad(hijriObj.getDate()));
    const monthName = hijriMonths[hijriObj.getMonth()] ?? "";
    const year = toEnglishDigits(String(hijriObj.getFullYear()));
    hijriDate = `${weekday} ${day} ${monthName} (${toEnglishDigits(String(hijriMonthNumber))}) ${year}`;
  }

  return { gregorianDate, hijriDate, gregorianMonthNumber, hijriMonthNumber };
};

export const dayTypeLabel = (dayType: string) =>
  dayType === "REMOTE" ? "عن بعد" : "حضوري";
