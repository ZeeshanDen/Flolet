import type { Group, SplitType } from "@/lib/types";
import { resolveSplit, validateSplit } from "./splitCalc";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPES: { key: SplitType; label: string }[] = [
  { key: "equal", label: "Equal" },
  { key: "exact", label: "Exact" },
  { key: "percent", label: "%" },
  { key: "shares", label: "Shares" },
  { key: "adjustment", label: "+/−" },
];

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
  const members = group.memberUids;
  const resolved = resolveSplit(total, state.type, members, state.input);
  const validity = validateSplit(total, state.type, members, state.input);

  const setType = (type: SplitType) => onChange({ ...state, type });
  const setPaidBy = (paidBy: string) => onChange({ ...state, paidBy });
  const setInput = (uid: string, value: number) =>
    onChange({ ...state, input: { ...state.input, [uid]: value } });

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-muted">Paid by</label>
        <select
          className="input"
          value={state.paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
        >
          {members.map((uid) => (
            <option key={uid} value={uid}>
              {group.members[uid]?.displayName ?? uid}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-muted">Split</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                state.type === t.key
                  ? "bg-brand text-white"
                  : "bg-card text-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {members.map((uid) => (
          <div
            key={uid}
            className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2"
          >
            <span className="truncate text-sm">
              {group.members[uid]?.displayName ?? uid}
            </span>
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
                {formatMoney(resolved[uid] ?? 0, group.currency)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!validity.ok && (
        <p className="text-sm text-bad">{validity.message}</p>
      )}
    </div>
  );
}
