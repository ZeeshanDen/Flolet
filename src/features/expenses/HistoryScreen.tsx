import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  parseISO,
  isToday,
  isYesterday,
  addMonths,
} from "date-fns";
import { useExpenses } from "@/features/expenses/useExpenses";
import { useCategories } from "@/features/categories/useCategories";
import { useProfile } from "@/features/profile/useProfile";
import { CategoryIcon } from "@/features/categories/icons";
import EditExpenseSheet from "@/features/expenses/EditExpenseSheet";
import { formatMoney, cn } from "@/lib/utils";
import type { Expense } from "@/lib/types";

type PeriodMode = "all" | "month" | "custom";

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isNaN(d.getTime())) return "Unknown date"; // tolerate bad docs
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM yyyy");
}

export default function HistoryScreen() {
  const { expenses, loading } = useExpenses();
  const { categories } = useCategories();
  const { currency } = useProfile();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [mode, setMode] = useState<PeriodMode>("month");
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const monthPrefix = format(monthCursor, "yyyy-MM");
    return expenses.filter((e) => {
      if (mode === "month" && !e.date.startsWith(monthPrefix)) return false;
      if (mode === "custom") {
        if (from && e.date < from) return false;
        if (to && e.date > to) return false;
      }
      if (!needle) return true;
      const cat = catById[e.categoryId];
      return (
        e.name?.toLowerCase().includes(needle) ||
        cat?.name.toLowerCase().includes(needle)
      );
    });
  }, [expenses, q, catById, mode, monthCursor, from, to]);

  const periodTotal = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  // Mini chart: the most recent 12 spending days in view, oldest → newest.
  const bars = useMemo(() => {
    const recent = groups.slice(0, 12).reverse();
    const max = Math.max(1, ...recent.map(([, it]) => sum(it)));
    return recent.map(([date, it]) => ({ date, pct: (sum(it) / max) * 100 }));
  }, [groups]);

  const periodLabel =
    mode === "month"
      ? format(monthCursor, "MMMM yyyy")
      : mode === "all"
        ? "All time"
        : from || to
          ? `${from || "…"} → ${to || "today"}`
          : "Custom range";

  return (
    <div className="space-y-3 px-4 pt-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight">History</h1>
        <div className="flex rounded-full bg-raised p-1 text-[12px] font-semibold">
          {(
            [
              { key: "month", label: "Month" },
              { key: "all", label: "All" },
              { key: "custom", label: "Range" },
            ] as { key: PeriodMode; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={cn(
                "rounded-full px-3 py-1.5 transition",
                mode === t.key
                  ? "bg-card text-text shadow-card"
                  : "text-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary card: period, total, mini chart */}
      <div className="card px-4 pb-3 pt-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-muted">
            {periodLabel}
          </span>
          {mode === "month" && (
            <div className="-mr-2 flex">
              <button
                onClick={() => setMonthCursor((c) => addMonths(c, -1))}
                aria-label="Previous month"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-raised"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                onClick={() => setMonthCursor((c) => addMonths(c, 1))}
                aria-label="Next month"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-raised"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </div>
        <div className="mt-0.5 text-[30px] font-bold tabular-nums tracking-[-0.03em]">
          {formatMoney(periodTotal, currency)}
        </div>
        <div className="text-[12px] text-muted">
          {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
        </div>
        {bars.length > 1 && (
          <div className="mt-3 flex h-14 items-end gap-1.5">
            {bars.map((b, i) => (
              <span
                key={b.date}
                className={cn(
                  "flex-1 rounded-t-md rounded-b-sm",
                  i === bars.length - 1 ? "bg-brand-soft" : "bg-raised",
                )}
                style={{ height: `${Math.max(6, b.pct)}%` }}
                title={`${b.date}`}
              />
            ))}
          </div>
        )}
        {mode === "custom" && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="date"
              className="input min-w-0 flex-1 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
            />
            <span className="text-sm text-muted">to</span>
            <input
              type="date"
              className="input min-w-0 flex-1 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
            />
          </div>
        )}
      </div>

      <div className="relative">
        <Search
          size={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          className="input rounded-full py-2.5 pl-11"
          placeholder="Search notes or categories"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {groups.length === 0 && (
        <p className="pt-8 text-center text-muted">
          {loading
            ? "Loading…"
            : mode === "all"
              ? "No expenses yet."
              : "No expenses in this period."}
        </p>
      )}

      {groups.map(([date, items]) => (
        <div key={date} className="card px-4 pb-1.5 pt-3">
          <div className="flex items-center justify-between text-[12px] font-semibold text-muted">
            <span>{dayLabel(date)}</span>
            <span className="tabular-nums">{formatMoney(sum(items), currency)}</span>
          </div>
          <div className="divide-y divide-border">
            {items.map((e) => {
              const cat = catById[e.categoryId];
              return (
                <button
                  key={e.id}
                  onClick={() => setEditing(e)}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition active:opacity-70"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: (cat?.color ?? "#94a3b8") + "1f",
                      color: cat?.color ?? "#94a3b8",
                    }}
                  >
                    <CategoryIcon name={cat?.icon ?? "CircleDollarSign"} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">
                      {e.name || cat?.name}
                    </p>
                    <p className="text-[12px] text-muted">{cat?.name}</p>
                  </div>
                  <span className="text-[14px] font-semibold tabular-nums">
                    {formatMoney(e.amount, currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <EditExpenseSheet expense={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function sum(items: Expense[]): number {
  return items.reduce((s, e) => s + e.amount, 0);
}
