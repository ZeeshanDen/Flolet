import { useEffect, useMemo, useState } from "react";
import { X, Trash2, Check } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import SplitEditor, {
  participants,
  type SplitState,
} from "@/features/split/SplitEditor";
import { resolveSplit, validateSplit } from "@/features/split/splitCalc";
import { useCategories } from "@/features/categories/useCategories";
import { CategoryIcon } from "@/features/categories/icons";
import {
  updateGroupExpense,
  deleteGroupExpenseDoc,
} from "@/features/groups/useGroup";
import { cn, currencySymbol } from "@/lib/utils";
import type { Group, GroupExpense } from "@/lib/types";

/**
 * Edit a shared expense the Splitwise way: amount, note, date, category,
 * who paid, and how it's split. Any group member can edit (matches rules).
 */
export default function GroupExpenseSheet({
  group,
  expense,
  onClose,
}: {
  group: Group;
  expense: GroupExpense | null;
  onClose: () => void;
}) {
  const { categories } = useCategories();
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [split, setSplit] = useState<SplitState>({
    paidBy: "",
    type: "equal",
    input: {},
  });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expense) return;
    setAmount(String(expense.amount));
    setName(expense.name ?? "");
    setDate(expense.date);
    setCategoryId(expense.categoryId);
    setSplit({
      paidBy: expense.paidBy,
      type: expense.splitType,
      input: expense.splitInput ?? {},
      included: expense.included,
    });
    setConfirmDelete(false);
    setError(null);
  }, [expense]);

  const numeric = parseFloat(amount) || 0;
  const who = participants(group, split);
  const validity = useMemo(
    () => validateSplit(numeric, split.type, who, split.input),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [numeric, split],
  );
  const canSave =
    /^\d{1,9}(\.\d{0,2})?$/.test(amount) &&
    numeric > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    validity.ok;

  const save = async () => {
    if (!expense || !canSave || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateGroupExpense(group.id, expense.id, {
        amount: numeric,
        categoryId,
        name: name.trim(),
        date,
        paidBy: split.paidBy,
        splitType: split.type,
        splitInput: split.input,
        shares: resolveSplit(numeric, split.type, who, split.input),
        included:
          split.type === "equal" && who.length < group.memberUids.length
            ? who
            : undefined,
      });
      onClose();
    } catch (e) {
      console.error("update group expense", e);
      setError("Couldn't save — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!expense || busy) return;
    setBusy(true);
    try {
      await deleteGroupExpenseDoc(group.id, expense.id);
      onClose();
    } catch (e) {
      console.error("delete group expense", e);
      setError("Couldn't delete — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={!!expense} onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Edit shared expense</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
        <span className="text-xl font-bold text-muted">
          {currencySymbol(group.currency)}
        </span>
        <input
          type="text"
          inputMode="decimal"
          aria-label="Amount"
          className="w-full bg-transparent text-2xl font-extrabold tracking-tight outline-none"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        />
      </div>

      <input
        className="input mb-3"
        placeholder="What was it for?"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="date"
        className="input mb-3"
        aria-label="Date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className="noscroll mb-4 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => {
          const active = c.id === categoryId;
          return (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                active ? "text-text" : "border-border bg-surface text-muted",
              )}
              style={
                active
                  ? { background: c.color + "22", borderColor: c.color }
                  : undefined
              }
            >
              <span style={{ color: c.color }}>
                <CategoryIcon name={c.icon} size={13} />
              </span>
              {c.name}
            </button>
          );
        })}
      </div>

      <SplitEditor
        group={group}
        total={numeric}
        state={split}
        onChange={setSplit}
      />

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      <div className="mt-4 flex gap-3">
        {confirmDelete ? (
          <button
            onClick={remove}
            disabled={busy}
            className="h-[52px] shrink-0 rounded-2xl bg-bad px-4 text-sm font-bold text-white"
          >
            Really delete?
          </button>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete expense"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-border text-bad"
          >
            <Trash2 size={20} />
          </button>
        )}
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
