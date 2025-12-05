declare module "hijri-date/lib/safe" {
  export default class HijriDate {
    constructor(date?: Date | number | string);
    getDate(): number;
    getMonth(): number;
    getFullYear(): number;
    getDay(): number;
  }

  export function toHijri(date?: Date | number | string): HijriDate;
}
