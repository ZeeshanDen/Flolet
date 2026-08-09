import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import type { Medicine, MedSlot } from "@/lib/types";

// Pure schedule math. All dates are local ISO yyyy-mm-dd strings — the same
// UTC-bug-avoiding convention as expense dates.

export const todayIso = () => format(new Date(), "yyyy-MM-dd");

const SLOT_LABEL: Record<MedSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Doses scheduled per day (weekly meds average across the week for display). */
function dosesPerDay(med: Medicine): number {
  return med.schedule.type === "daily" ? Math.max(1, med.schedule.slots.length) : 0;
}

/** Count occurrences of `weekday` in (start, end] — start exclusive, end inclusive. */
function weekdayOccurrences(start: Date, end: Date, weekday: number): number {
  const days = differenceInCalendarDays(end, start);
  if (days <= 0) return 0;
  let count = Math.floor(days / 7);
  const rem = days % 7;
  // Check the leftover window (start+7k+1 … end)
  for (let i = 1; i <= rem; i++) {
    if (addDays(start, Math.floor(days / 7) * 7 + i).getDay() === weekday)
      count++;
  }
  return count;
}

/** Doses consumed between stockAsOf (exclusive — stock counted that morning) and today (inclusive-ish). */
export function consumedDoses(med: Medicine, today: string): number {
  const from = parseISO(med.stockAsOf);
  const to = parseISO(today);
  const days = differenceInCalendarDays(to, from);
  if (days <= 0) return 0;
  if (med.schedule.type === "daily") return days * dosesPerDay(med);
  return weekdayOccurrences(from, to, med.schedule.weekday);
}

/** Units remaining as of today, floored at 0. */
export function remainingUnits(med: Medicine, today: string = todayIso()): number {
  const used = consumedDoses(med, today) * med.unitsPerDose;
  return Math.max(0, Math.round((med.stock - used) * 100) / 100);
}

/**
 * The local ISO date of the last day a full dose can still be taken.
 * Daily: stockAsOf + ceil-ish coverage. Weekly: the Nth next scheduled weekday.
 */
export function runOutDate(med: Medicine): string {
  const dosesLeftTotal = Math.floor(med.stock / med.unitsPerDose);
  const start = parseISO(med.stockAsOf);
  if (med.schedule.type === "daily") {
    const perDay = dosesPerDay(med);
    const daysCovered = Math.ceil(dosesLeftTotal / perDay);
    return format(addDays(start, daysCovered), "yyyy-MM-dd");
  }
  // Weekly: walk to the Nth occurrence of the weekday after stockAsOf.
  let d = start;
  let remaining = dosesLeftTotal;
  while (remaining > 0) {
    d = addDays(d, 1);
    if (d.getDay() === med.schedule.weekday) remaining--;
  }
  // Supply lasts through the final dose day; runs out the day after.
  return format(addDays(d, 1), "yyyy-MM-dd");
}

/** Whole days until the supply is exhausted. 0 = out today or already out. */
export function daysLeft(med: Medicine, today: string = todayIso()): number {
  if (remainingUnits(med, today) <= 0) return 0;
  return Math.max(
    0,
    differenceInCalendarDays(parseISO(runOutDate(med)), parseISO(today)),
  );
}

/** Human schedule summary: "Morning + night · 2×/day" or "Weekly · Mon". */
export function scheduleLabel(med: Medicine): string {
  if (med.schedule.type === "weekly")
    return `Weekly · ${WEEKDAYS[med.schedule.weekday] ?? "?"}`;
  const slots = med.schedule.slots;
  if (slots.length === 0) return "Daily";
  const names = slots.map((s) => SLOT_LABEL[s]);
  const joined =
    names.length <= 2 ? names.join(" + ") : `${names.length} times`;
  return `${joined} · ${slots.length}×/day`;
}
