import { useMemo, useState } from "react";
import { Search, Pencil } from "lucide-react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { useExpenses } from "@/features/expenses/useExpenses";
import { useCategories } from "@/features/categories/useCategories";
import { useProfile } from "@/features/profile/useProfile";
import { CategoryIcon } from "@/features/categories/icons";
import EditExpenseSheet from "@/features/expenses/EditExpenseSheet";
import { formatMoney } from "@/lib/utils";
import type { Expense } from "@/lib/types";

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM yyyy");
}

export default function HistoryScreen() {
  const { expenses } = useExpenses();
  const { categories } = useCategories();
  const { currency } = useProfile();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);

  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return expenses;
    return expenses.filter((e) => {
      const cat = catById[e.categoryId];
      return (
        e.name?.toLowerCase().includes(needle) ||
        cat?.name.toLowerCase().includes(needle)
      );
    });
  }, [expenses, q, catById]);

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

      {groups.length === 0 && (
        <p className="mt-10 text-center text-muted">No expenses yet.</p>
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
