import { useEffect, useState } from "react";
import { X, Trash2, Check } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { useCategories } from "@/features/categories/useCategories";
import { useExpenses } from "@/features/expenses/useExpenses";
import { useProfile } from "@/features/profile/useProfile";
import { CategoryIcon } from "@/features/categories/icons";
import { cn, currencySymbol } from "@/lib/utils";
import type { Expense } from "@/lib/types";

/**
 * Edit a personal expense: amount, category, note, date. Delete lives here too.
 * Group (shared) expenses aren't editable from the personal history list.
 */
export default function EditExpenseSheet({
  expense,
  onClose,
}: {
  expense: Expense | null;
  onClose: () => void;
}) {
  const { categories } = useCategories();
  const { currency } = useProfile();
  const { updateExpense, deleteExpense, nameSuggestions } = useExpenses();

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expense) return;
    setAmount(String(expense.amount));
    setCategoryId(expense.categoryId);
    setName(expense.name ?? "");
    setDate(expense.date);
  }, [expense]);

  const numeric = parseFloat(amount) || 0;
  const canSave = numeric > 0 && !!categoryId;

  const save = async () => {
    if (!expense || !canSave || !categoryId) return;
    setBusy(true);
    const cat = categories.find((c) => c.id === categoryId);
    try {
      await updateExpense(expense.id, {
        amount: numeric,
        categoryId,
        name: name.trim() || cat?.name || "",
        date,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!expense) return;
    setBusy(true);
    try {
      await deleteExpense(expense.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={!!expense} onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Edit expense</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted"
        >
          <X size={18} />
        </button>
      </div>

      {/* Amount */}
      <div className="mb-2 text-xs font-semibold text-muted">Amount</div>
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
        <span className="text-xl font-bold text-muted">
          {currencySymbol(currency)}
        </span>
        <input
          type="text"
          inputMode="decimal"
          className="w-full bg-transparent text-2xl font-extrabold tracking-tight outline-none"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        />
      </div>

      {/* Category */}
      <div className="mb-2 text-xs font-semibold text-muted">Category</div>
      <div className="mb-4 grid grid-cols-4 gap-2.5">
        {categories.map((c) => {
          const active = c.id === categoryId;
          return (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl py-2.5 transition",
                active ? "border-[1.5px]" : "border border-border bg-surface",
              )}
              style={
                active
                  ? { background: c.color + "22", borderColor: c.color }
                  : undefined
              }
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  background: c.color + (active ? "33" : "1f"),
                  color: c.color,
                }}
              >
                <CategoryIcon name={c.icon} size={18} />
              </span>
              <span
                className={cn(
                  "max-w-full truncate text-[11px] font-semibold",
                  active ? "text-text" : "text-muted",
                )}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Note + date */}
      <input
        className="input mb-3"
        placeholder="Note (optional)"
        list="edit-name-suggestions"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <datalist id="edit-name-suggestions">
        {nameSuggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <input
        type="date"
        className="input mb-5"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className="flex gap-3">
        <button
          onClick={remove}
          disabled={busy}
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-border text-bad"
          aria-label="Delete"
        >
          <Trash2 size={20} />
        </button>
        <button
          onClick={save}
          disabled={!canSave || busy}
          className="btn-brand flex-1 disabled:bg-border disabled:text-muted"
        >
          <Check size={20} />
          Save changes
        </button>
      </div>
    </BottomSheet>
  );
}
