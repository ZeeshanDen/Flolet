import { useState } from "react";
import { HandCoins, Trash2, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { myEffectCents } from "@/features/split/balances";
import { formatMoney, fromCents, cn } from "@/lib/utils";
import type { Group, GroupExpense, Settlement } from "@/lib/types";

export type ActivityItem =
  | { kind: "expense"; group: Group; e: GroupExpense }
  | { kind: "settlement"; group: Group; s: Settlement };

function safeDay(iso: string): string {
  const d = parseISO(iso);
  return isNaN(d.getTime()) ? "" : format(d, "d MMM");
}

/** Newest first; same-day ties by creation time. */
export function sortActivity(items: ActivityItem[]): ActivityItem[] {
  const key = (i: ActivityItem) =>
    i.kind === "expense"
      ? [i.e.date, i.e.createdAt ?? 0]
      : [i.s.date, i.s.createdAt ?? 0];
  return [...items].sort((a, b) => {
    const [da, ca] = key(a);
    const [db, cb] = key(b);
    if (da !== db) return da < db ? 1 : -1;
    return (cb as number) - (ca as number);
  });
}

/**
 * Splitwise-style activity rows: each expense shows YOUR effect (lent /
 * borrowed / not involved) and opens the editor; settlements are listed
 * and deletable.
 */
export default function ActivityList({
  items,
  me,
  showGroup = false,
  onEdit,
  onDeleteSettlement,
}: {
  items: ActivityItem[];
  me: string;
  showGroup?: boolean;
  onEdit: (group: Group, e: GroupExpense) => void;
  onDeleteSettlement: (group: Group, s: Settlement) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const nameOf = (g: Group, uid: string) =>
    uid === me ? "You" : (g.members[uid]?.displayName ?? "Someone");

  if (items.length === 0)
    return (
      <p className="py-6 text-center text-sm text-muted">No activity yet.</p>
    );

  return (
    <div className="space-y-2">
      {items.map((item) => {
        if (item.kind === "settlement") {
          const { group: g, s } = item;
          return (
            <div
              key={`s-${g.id}-${s.id}`}
              className="flex items-center gap-3 rounded-xl border border-good/20 bg-good/5 px-3 py-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-good/15 text-good">
                <HandCoins size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {nameOf(g, s.fromUid)} paid {nameOf(g, s.toUid)}
                </p>
                <p className="text-xs text-muted">
                  Settle up · {safeDay(s.date)}
                  {showGroup ? ` · ${g.name}` : ""}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-good">
                {formatMoney(s.amount, g.currency)}
              </span>
              {confirmId === s.id ? (
                <button
                  onClick={() => {
                    onDeleteSettlement(g, s);
                    setConfirmId(null);
                  }}
                  className="rounded-lg bg-bad px-2 py-1 text-xs font-semibold text-white"
                >
                  Delete
                </button>
              ) : (
                <button
                  onClick={() => setConfirmId(s.id)}
                  aria-label="Delete settlement"
                  className="flex h-8 w-8 items-center justify-center text-muted hover:text-bad"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          );
        }

        const { group: g, e } = item;
        const effect = myEffectCents(me, e);
        return (
          <button
            key={`e-${g.id}-${e.id}`}
            onClick={() => onEdit(g, e)}
            className="flex w-full items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left transition active:scale-[0.99]"
          >
            <div className="w-10 shrink-0 text-center text-[11px] font-semibold uppercase leading-tight text-muted">
              {safeDay(e.date)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{e.name || "Expense"}</p>
              <p className="truncate text-xs text-muted">
                {nameOf(g, e.paidBy)} paid{" "}
                {formatMoney(e.amount, g.currency)}
                {showGroup ? ` · ${g.name}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "text-[11px] font-medium",
                  effect > 0 ? "text-good" : effect < 0 ? "text-[#f97316]" : "text-muted",
                )}
              >
                {effect > 0 ? "you lent" : effect < 0 ? "you borrowed" : "not involved"}
              </p>
              {effect !== 0 && (
                <p
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    effect > 0 ? "text-good" : "text-[#f97316]",
                  )}
                >
                  {formatMoney(fromCents(Math.abs(effect)), g.currency)}
                </p>
              )}
            </div>
            <ChevronRight size={15} className="shrink-0 text-muted" />
          </button>
        );
      })}
    </div>
  );
}
