import { useMemo, useState } from "react";
import { Search, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [mode, setMode] = useState<PeriodMode>("all");
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

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-xl font-bold">History</h1>

      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          className="input pl-10"
          placeholder="Search notes or categories"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Period filter */}
      <div className="mb-3 flex gap-2 rounded-xl bg-surface p-1">
        {(
          [
            { key: "all", label: "All" },
            { key: "month", label: "Month" },
            { key: "custom", label: "Custom" },
          ] as { key: PeriodMode; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition",
              mode === t.key ? "bg-brand text-on-brand" : "text-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "month" && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-surface px-2 py-1.5">
          <button
            onClick={() => setMonthCursor((c) => addMonths(c, -1))}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center text-muted"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold">{format(monthCursor, "MMMM yyyy")}</span>
          <button
            onClick={() => setMonthCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center text-muted"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {mode === "custom" && (
        <div className="mb-3 flex items-center gap-2">
          <input
            type="date"
            className="input flex-1"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
          />
          <span className="text-sm text-muted">to</span>
          <input
            type="date"
            className="input flex-1"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
          />
        </div>
      )}

      {mode !== "all" && filtered.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-brand/10 px-3.5 py-2.5 text-sm">
          <span className="text-muted">
            {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
          </span>
          <span className="font-bold text-brand-soft">
            {formatMoney(periodTotal, currency)}
          </span>
        </div>
      )}

      {groups.length === 0 && (
        <p className="mt-10 text-center text-muted">
          {loading
            ? "Loading…"
            : mode === "all"
              ? "No expenses yet."
              : "No expenses in this period."}
        </p>
      )}

      <div className="space-y-5">
        {groups.map(([date, items]) => {
          const dayTotal = items.reduce((s, e) => s + e.amount, 0);
          return (
            <div key={date}>
              <div className="mb-2 flex items-center justify-between text-sm text-muted">
                <span>{dayLabel(date)}</span>
                <span>{formatMoney(dayTotal, currency)}</span>
              </div>
              <div className="space-y-2">
                {items.map((e) => {
                  const cat = catById[e.categoryId];
                  return (
                    <button
                      key={e.id}
                      onClick={() => setEditing(e)}
                      className="flex w-full items-center gap-3 rounded-xl bg-card px-3 py-2 text-left transition active:scale-[0.99]"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: (cat?.color ?? "#94a3b8") + "33",
                          color: cat?.color ?? "#94a3b8",
                        }}
                      >
                        <CategoryIcon name={cat?.icon ?? "CircleDollarSign"} size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {e.name || cat?.name}
                        </p>
                        <p className="text-xs text-muted">{cat?.name}</p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatMoney(e.amount, currency)}
                      </span>
                      <Pencil size={15} className="shrink-0 text-muted" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <EditExpenseSheet expense={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
