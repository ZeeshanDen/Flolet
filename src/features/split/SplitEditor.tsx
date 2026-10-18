import { Check } from "lucide-react";
import type { Group, SplitType } from "@/lib/types";
import { resolveSplit, validateSplit } from "./splitCalc";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPES: { key: SplitType; label: string }[] = [
  { key: "equal", label: "=" },
  { key: "exact", label: "1.23" },
  { key: "percent", label: "%" },
  { key: "shares", label: "Shares" },
  { key: "adjustment", label: "+/−" },
];

const TYPE_HINT: Record<SplitType, string> = {
  equal: "Select who owes an equal share.",
  exact: "Enter the exact amount each person owes.",
  percent: "Percentages must add up to 100%.",
  shares: "Split by ratio — e.g. 2 : 1.",
  adjustment: "Equal base, plus per-person adjustments.",
};

const placeholderByType: Record<SplitType, string> = {
  equal: "",
  exact: "amount",
  percent: "%",
  shares: "weight",
  adjustment: "+/−",
};

export interface SplitState {
  paidBy: string;
  type: SplitType;
  input: Record<string, number>;
  /** Members participating in an EQUAL split (others owe nothing). */
  included?: string[];
}

/** Members that actually take part, given the state. */
export function participants(group: Group, state: SplitState): string[] {
  if (state.type === "equal" && state.included && state.included.length > 0)
    return group.memberUids.filter((u) => state.included!.includes(u));
  return group.memberUids;
}

export default function SplitEditor({
  group,
  total,
  state,
  onChange,
}: {
  group: Group;
  total: number;
  state: SplitState;
  onChange: (s: SplitState) => void;
}) {
  const members = participants(group, state);
  const resolved = resolveSplit(total, state.type, members, state.input);
  const validity = validateSplit(total, state.type, members, state.input);
  const nameOf = (uid: string) => group.members[uid]?.displayName ?? uid;

  const setType = (type: SplitType) => onChange({ ...state, type });
  const setPaidBy = (paidBy: string) => onChange({ ...state, paidBy });
  const setInput = (uid: string, value: number) =>
    onChange({ ...state, input: { ...state.input, [uid]: value } });
  const toggleIncluded = (uid: string) => {
    const cur = state.included ?? group.memberUids;
    const next = cur.includes(uid)
      ? cur.filter((u) => u !== uid)
      : [...cur, uid];
    if (next.length === 0) return; // someone must owe
    onChange({ ...state, included: next });
  };

  const perPerson =
    state.type === "equal" && members.length > 0 ? total / members.length : null;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-muted">Paid by</label>
        <select
          className="input"
          value={state.paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
        >
          {group.memberUids.map((uid) => (
            <option key={uid} value={uid}>
              {nameOf(uid)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-muted">Split method</label>
        <div className="flex gap-2 overflow-x-auto pb-1 noscroll">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={cn(
                "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold tabular-nums transition",
                state.type === t.key
                  ? "bg-brand text-white"
                  : "bg-card text-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">{TYPE_HINT[state.type]}</p>
      </div>

      <div className="space-y-2">
        {group.memberUids.map((uid) => {
          const included = members.includes(uid);
          return (
            <div
              key={uid}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2",
                state.type === "equal" && !included && "opacity-45",
              )}
            >
              {state.type === "equal" ? (
                <button
                  onClick={() => toggleIncluded(uid)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      included
                        ? "border-good bg-good text-white"
                        : "border-border bg-card",
                    )}
                  >
                    {included && <Check size={12} />}
                  </span>
                  <span className="truncate text-sm">{nameOf(uid)}</span>
                </button>
              ) : (
                <span className="truncate text-sm">{nameOf(uid)}</span>
              )}
              <div className="flex items-center gap-3">
                {state.type !== "equal" && (
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-right text-sm"
                    placeholder={placeholderByType[state.type]}
                    value={state.input[uid] ?? ""}
                    onChange={(e) =>
                      setInput(uid, parseFloat(e.target.value) || 0)
                    }
                  />
                )}
                <span className="w-16 text-right text-sm font-semibold text-brand-soft">
                  {included || state.type !== "equal"
                    ? formatMoney(resolved[uid] ?? 0, group.currency)
                    : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Splitwise-style footer summary */}
      {perPerson !== null && (
        <div className="flex items-center justify-between rounded-xl bg-brand/10 px-3.5 py-2.5">
          <span className="text-sm font-bold text-brand-soft">
            {formatMoney(perPerson, group.currency)}/person
          </span>
          <span className="text-xs text-muted">
            ({members.length} {members.length === 1 ? "person" : "people"})
          </span>
        </div>
      )}

      {!validity.ok && (
        <p className="text-sm text-bad">{validity.message}</p>
      )}
    </div>
  );
}
