import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(new URL("./schedule.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { alternatingTuesday, isTuesdayDate, resolveSchedule, upcomingTuesdays } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("Tuesday reference requires a real date and correct weekday", () => {
  assert.equal(isTuesdayDate("2026-09-15"), true);
  for (const date of [null, "", "2026-09-14", "2026-02-31", "bad"]) assert.equal(isTuesdayDate(date), false);
});
test("alternation works before and after reference across months and years", () => {
  assert.equal(alternatingTuesday("2026-09-08", "2026-09-15", "REMOTE"), "ON_SITE");
  assert.equal(alternatingTuesday("2026-09-15", "2026-09-15", "REMOTE"), "REMOTE");
  assert.equal(alternatingTuesday("2026-09-22", "2026-09-15", "REMOTE"), "ON_SITE");
  assert.equal(alternatingTuesday("2026-10-13", "2026-09-15", "REMOTE"), "REMOTE");
  assert.equal(alternatingTuesday("2027-01-05", "2026-12-29", "ON_SITE"), "REMOTE");
});
const settings = { scheduleMode: "AUTO", tuesdayReferenceDate: "2026-09-15", tuesdayReferenceType: "REMOTE", remoteDays: "1,3", currentDayType: "ON_SITE" };
test("Riyadh midnight changes Monday to alternating Tuesday", () => {
  assert.equal(resolveSchedule({ ...settings, remoteDays: "" }, new Date("2026-09-14T20:59:59Z")), "ON_SITE");
  assert.equal(resolveSchedule(settings, new Date("2026-09-14T21:00:00Z")), "REMOTE");
  assert.equal(resolveSchedule(settings, new Date("2026-09-21T21:00:00Z")), "ON_SITE");
});
test("fixed modes override all weekdays; restoring auto retains original parity", () => {
  for (const mode of ["REMOTE", "ON_SITE"]) {
    for (let day = 13; day <= 19; day++) assert.equal(resolveSchedule({ ...settings, scheduleMode: mode }, new Date(`2026-09-${day}T10:00:00Z`)), mode);
  }
  assert.equal(resolveSchedule(settings, new Date("2026-09-29T10:00:00Z")), "REMOTE");
  assert.equal(resolveSchedule(settings, new Date("2026-09-16T10:00:00Z")), "REMOTE");
  assert.equal(resolveSchedule(settings, new Date("2026-09-17T10:00:00Z")), "ON_SITE");
});
test("preview uses Riyadh date and includes today when Tuesday", () => {
  assert.deepEqual(upcomingTuesdays(new Date("2026-09-14T21:00:00Z")), ["2026-09-15", "2026-09-22", "2026-09-29", "2026-10-06"]);
});
