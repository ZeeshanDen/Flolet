import { parseISO, format } from "date-fns";
import type { Expense, Category } from "@/lib/types";

export interface CategorySlice {
  categoryId: string;
  name: string;
  color: string;
  value: number;
}

export interface Bucket {
  key: string; // day iso or month label
  label: string;
  total: number;
}

/** Filter expenses to a given yyyy-mm prefix, or a whole year yyyy. */
export function inPeriod(e: Expense, prefix: string): boolean {
  return e.date.startsWith(prefix);
}

export function categoryBreakdown(
  expenses: Expense[],
  cats: Record<string, Category>,
): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const e of expenses)
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount);
  return [...totals.entries()]
    .map(([categoryId, value]) => ({
      categoryId,
      name: cats[categoryId]?.name ?? "Other",
      color: cats[categoryId]?.color ?? "#94a3b8",
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Daily totals across a month prefix (yyyy-mm). */
export function dailyBuckets(expenses: Expense[]): Bucket[] {
  const map = new Map<string, number>();
  for (const e of expenses)
    map.set(e.date, (map.get(e.date) ?? 0) + e.amount);
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, total]) => ({
      key,
      label: format(parseISO(key), "d"),
      total: Math.round(total * 100) / 100,
    }));
}

/** Monthly totals across a year prefix (yyyy). */
export function monthlyBuckets(expenses: Expense[]): Bucket[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const m = e.date.slice(0, 7);
    map.set(m, (map.get(m) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, total]) => ({
      key,
      label: format(parseISO(key + "-01"), "MMM"),
      total: Math.round(total * 100) / 100,
    }));
}

export function sumAmount(expenses: Expense[]): number {
  return Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
}
