/** UI dates use day/month/year; stored dates remain ISO year-month-day. */
export const formatDateParts = (day: string | number, month: string | number, year: string | number) =>
  `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).padStart(4, "0")}`;

export const formatISODate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return formatDateParts(day, month, year);
};
