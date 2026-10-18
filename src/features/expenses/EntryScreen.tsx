import { useEffect, useMemo, useState } from "react";
import { Check, Users, X, Plus, Calendar, Pencil, Delete } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/features/profile/useProfile";
import { useCategories } from "@/features/categories/useCategories";
import { useExpenses } from "@/features/expenses/useExpenses";
import { useGroups } from "@/features/groups/useGroups";
import { writeGroupExpense } from "@/features/groups/useGroup";
import { CategoryIcon } from "@/features/categories/icons";
import AddCategorySheet from "@/features/categories/AddCategorySheet";
import { pushKey } from "@/features/expenses/Numpad";
import BottomSheet from "@/components/BottomSheet";
import SplitEditor, {
  participants,
  type SplitState,
} from "@/features/split/SplitEditor";
import { resolveSplit, validateSplit } from "@/features/split/splitCalc";
import { cn, currencySymbol, CURRENCIES } from "@/lib/utils";
import { format } from "date-fns";

// Local date, not UTC — toISOString() would date a 1am IST expense yesterday.
const today = () => format(new Date(), "yyyy-MM-dd");
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function EntryScreen() {
  const { user } = useAuth();
  const { currency } = useProfile();
  const { categories } = useCategories();
  const { addExpense, nameSuggestions } = useExpenses();
  const { groups, createGroup } = useGroups();

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Focus-mode sheet state
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);

  const [groupId, setGroupId] = useState<string | null>(null);
  const [split, setSplit] = useState<SplitState>({
    paidBy: user?.uid ?? "",
    type: "equal",
    input: {},
  });

  // Inline group creation from the split sheet.
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCurrency, setNewGroupCurrency] = useState(currency);
  const [groupBusy, setGroupBusy] = useState(false);

  const numeric = parseFloat(amount) || 0;
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;
  const splitActive = !!selectedGroup; // split is "on" once a group is chosen

  // Default the group once groups load and the split sheet opens.
  useEffect(() => {
    if (splitOpen && !groupId && groups.length > 0 && !creatingGroup)
      setGroupId(groups[0].id);
  }, [splitOpen, groupId, groups, creatingGroup]);

  // With the split sheet open but no groups yet, jump to inline creation.
  useEffect(() => {
    if (splitOpen && groups.length === 0) setCreatingGroup(true);
  }, [splitOpen, groups.length]);

  useEffect(() => setNewGroupCurrency(currency), [currency]);

  // "Who's included" is per-group; a stale list from another group would
  // match nobody here.
  useEffect(() => {
    setSplit((s) => ({ ...s, included: undefined, input: {} }));
  }, [groupId]);

  useEffect(() => {
    if (user) setSplit((s) => ({ ...s, paidBy: user.uid }));
  }, [user]);

  const createGroupInline = async () => {
    if (!newGroupName.trim()) return;
    setGroupBusy(true);
    try {
      const id = await createGroup(newGroupName.trim(), newGroupCurrency);
      if (id) {
        setGroupId(id);
        setCreatingGroup(false);
        setNewGroupName("");
      }
    } finally {
      setGroupBusy(false);
    }
  };

  const splitValid = useMemo(() => {
    if (!selectedGroup) return { ok: true as const };
    return validateSplit(
      numeric,
      split.type,
      participants(selectedGroup, split),
      split.input,
    );
  }, [selectedGroup, numeric, split]);

  const canSave =
    numeric > 0 &&
    !!categoryId &&
    DATE_RE.test(date) && // cleared date input would brick History/Insights
    (!splitActive || splitValid.ok);

  const reset = () => {
    setAmount("");
    setCategoryId(null);
    setName("");
    setDate(today());
    setGroupId(null);
    setSplit({ paidBy: user?.uid ?? "", type: "equal", input: {} });
  };

  const save = async () => {
    if (!canSave || !categoryId || saving) return; // saving guard: no double-tap dupes
    setSaving(true);
    setSaveError(null);
    const cat = categories.find((c) => c.id === categoryId);
    const finalName = name.trim() || cat?.name || "";
    try {
      if (splitActive && selectedGroup) {
        const shares = resolveSplit(
          numeric,
          split.type,
          participants(selectedGroup, split),
          split.input,
        );
        await writeGroupExpense(selectedGroup.id, {
          amount: numeric,
          categoryId,
          name: finalName,
          date,
          paidBy: split.paidBy,
          splitType: split.type,
          splitInput: split.input,
          shares,
          createdBy: user!.uid,
        });
      } else {
        await addExpense({ amount: numeric, categoryId, name: finalName, date });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
      reset();
    } catch (e) {
      console.error("save expense", e);
      setSaveError("Couldn't save — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const onSavePress = () => {
    if (numeric <= 0) setKeypadOpen(true);
    else save();
  };

  const key = (k: string) => {
    navigator.vibrate?.(8);
    setAmount((a) => pushKey(a, k));
  };

  return (
    <div className="flex h-full flex-col px-[22px] pt-1.5">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between pt-1">
        <h1 className="text-xl font-extrabold tracking-tight">New expense</h1>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-muted">
          <Calendar size={14} />
          <span>{date === today() ? "Today" : date}</span>
          <input
            type="date"
            className="sr-only"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>

      {/* Amount card — tap to raise keypad; Split pill inside */}
      <div className="mt-3.5 flex h-[77px] shrink-0 items-center justify-between rounded-[22px] border border-white/15 bg-gradient-to-br from-[#2a2545] to-brand px-5 shadow-[0_14px_30px_-12px_rgba(139,92,246,0.6)]">
        <button onClick={() => setKeypadOpen(true)} className="flex-1 text-left">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70">
            {amount ? "Amount" : "Tap to enter amount"}
          </div>
          <div className="mt-0.5 flex min-w-0 items-baseline gap-1.5">
            <span className="text-xl font-bold text-white/85">
              {currencySymbol(currency)}
            </span>
            <span
              className={cn(
                "min-w-0 truncate font-extrabold leading-none tracking-tight text-white",
                amount.length > 9 ? "text-2xl" : "text-4xl",
              )}
            >
              {amount || "0"}
            </span>
          </div>
        </button>
        <button
          onClick={() => setSplitOpen(true)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold text-white transition",
            splitActive ? "bg-white/30" : "bg-white/15",
          )}
        >
          <Users size={16} />
          {splitActive ? "Split on" : "Split"}
        </button>
      </div>

      {/* Category */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-5">
        <div className="pb-2.5 text-[13px] font-semibold text-muted">
          Category
        </div>
        <div className="grid grid-cols-4 gap-2.5">
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
                    ? {
                        background: c.color + "22",
                        borderColor: c.color,
                        boxShadow: `0 4px 12px -4px ${c.color}66`,
                      }
                    : undefined
                }
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: c.color + (active ? "33" : "1f"),
                    color: c.color,
                  }}
                >
                  <CategoryIcon name={c.icon} size={19} />
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
          <button
            onClick={() => setAddCatOpen(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-brand-soft py-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand-soft">
              <Plus size={20} />
            </span>
            <span className="text-[11px] font-semibold text-brand-soft">
              Add
            </span>
          </button>
        </div>

        {/* Note */}
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 py-3">
          <Pencil size={16} className="text-muted" />
          <input
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            placeholder="Add a note (optional)"
            list="name-suggestions"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <datalist id="name-suggestions">
            {nameSuggestions.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Save — pinned above nav */}
      <div className="shrink-0 pb-3 pt-2">
        {saveError && (
          <p className="mb-2 text-center text-sm text-bad">{saveError}</p>
        )}
        <button
          onClick={onSavePress}
          disabled={saving}
          className={cn(
            "flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition",
            saved
              ? "bg-good text-white"
              : canSave
                ? "bg-brand text-white"
                : "bg-border text-muted",
          )}
        >
          <Check size={20} />
          {saved ? "Saved" : splitActive ? "Save split" : "Save"}
        </button>
      </div>

      {/* ── Keypad sheet ── */}
      <BottomSheet open={keypadOpen} onClose={() => setKeypadOpen(false)}>
        <div className="flex items-baseline justify-center gap-1 pb-3 pt-1">
          <span className="text-[22px] font-bold text-muted">
            {currencySymbol(currency)}
          </span>
          <span className="text-[40px] font-extrabold tracking-tight text-text">
            {amount || "0"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => key(k)}
              className={cn(
                "flex h-14 items-center justify-center rounded-2xl text-2xl font-semibold text-text transition active:scale-90",
                k === "del"
                  ? "bg-transparent"
                  : "bg-card shadow-[0_1px_2px_rgba(20,16,45,0.06)]",
              )}
            >
              {k === "del" ? <Delete size={24} className="text-muted" /> : k}
            </button>
          ))}
        </div>
        <button
          onClick={() => setKeypadOpen(false)}
          className={cn(
            "mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition",
            numeric > 0 ? "bg-brand text-white" : "bg-border text-muted",
          )}
        >
          {numeric > 0 ? "Done" : "Enter amount"}
        </button>
      </BottomSheet>

      {/* ── Split sheet ── */}
      <BottomSheet open={splitOpen} onClose={() => setSplitOpen(false)}>
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">
            Split {currencySymbol(currency)}
            {amount || "0"}
          </h2>
          <button
            onClick={() => setSplitOpen(false)}
            aria-label="Close split"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted"
          >
            <X size={18} />
          </button>
        </div>

        {creatingGroup ? (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted">New group</div>
            <input
              className="input"
              placeholder="Group name (e.g. Flatmates)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              autoFocus
            />
            <select
              className="input"
              value={newGroupCurrency}
              onChange={(e) => setNewGroupCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {currencySymbol(c)} {c}
                </option>
              ))}
            </select>
            <button
              onClick={createGroupInline}
              disabled={!newGroupName.trim() || groupBusy}
              className="btn-brand w-full disabled:bg-border disabled:text-muted"
            >
              <Plus size={18} />
              Create group
            </button>
            {groups.length > 0 && (
              <button
                onClick={() => setCreatingGroup(false)}
                className="w-full text-sm text-muted"
              >
                Cancel
              </button>
            )}
          </div>
        ) : selectedGroup ? (
          <>
            {/* Group chips */}
            <div className="mb-1.5 text-xs font-semibold text-muted">Group</div>
            <div className="noscroll mb-4 flex gap-2 overflow-x-auto pb-1">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
                    g.id === groupId
                      ? "bg-brand text-white"
                      : "border border-border bg-surface text-muted",
                  )}
                >
                  {g.name}
                </button>
              ))}
              <button
                onClick={() => setCreatingGroup(true)}
                className="shrink-0 whitespace-nowrap rounded-full border-[1.5px] border-dashed border-brand-soft px-4 py-2 text-sm font-semibold text-brand-soft"
              >
                + New
              </button>
            </div>

            <SplitEditor
              group={selectedGroup}
              total={numeric}
              state={split}
              onChange={setSplit}
            />

            <button
              onClick={() => setSplitOpen(false)}
              className="btn-brand mt-4 w-full"
            >
              Done
            </button>
          </>
        ) : null}
      </BottomSheet>

      {/* ── Add-category sheet ── */}
      <AddCategorySheet
        open={addCatOpen}
        onClose={() => setAddCatOpen(false)}
        onCreated={(id) => setCategoryId(id)}
      />
    </div>
  );
}
