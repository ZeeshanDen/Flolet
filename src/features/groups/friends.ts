import { pairwiseNet } from "@/features/split/balances";
import type { Group, GroupExpense, Settlement } from "@/lib/types";

export interface Friend {
  uid: string;
  name: string;
  email: string;
  /** Positive = they owe you; negative = you owe them. Per currency. */
  netByCurrency: Record<string, number>;
  groupIds: string[];
}

/** Everyone you share a group with, with pairwise balances across groups. */
export function buildFriends(
  me: string,
  groups: Group[],
  expenses: Record<string, GroupExpense[]>,
  settlements: Record<string, Settlement[]>,
): Friend[] {
  const map = new Map<string, Friend>();
  for (const g of groups) {
    for (const uid of g.memberUids) {
      if (uid === me) continue;
      const f = map.get(uid) ?? {
        uid,
        name: g.members[uid]?.displayName ?? "Someone",
        email: g.members[uid]?.email ?? "",
        netByCurrency: {},
        groupIds: [],
      };
      const net = pairwiseNet(
        me,
        uid,
        expenses[g.id] ?? [],
        settlements[g.id] ?? [],
      );
      f.netByCurrency[g.currency] =
        Math.round(((f.netByCurrency[g.currency] ?? 0) + net) * 100) / 100;
      f.groupIds.push(g.id);
      map.set(uid, f);
    }
  }
  // Biggest outstanding first, settled friends last.
  const weight = (f: Friend) =>
    Math.max(0, ...Object.values(f.netByCurrency).map(Math.abs));
  return [...map.values()].sort((a, b) => weight(b) - weight(a));
}
