import type { GroupExpense, Settlement } from "@/lib/types";
import { toCents, fromCents } from "@/lib/utils";

export interface Balance {
  uid: string;
  net: number; // + => owed money (others owe them); - => owes money
}

export interface Debt {
  fromUid: string; // owes
  toUid: string; // is owed
  amount: number;
}

/**
 * Net balance per member across all group expenses + settlements.
 * net = paid - owed + settlementsReceived - settlementsSent
 */
export function computeBalances(
  memberUids: string[],
  expenses: GroupExpense[],
  settlements: Settlement[],
): Balance[] {
  const net: Record<string, number> = {};
  for (const uid of memberUids) net[uid] = 0;

  for (const exp of expenses) {
    net[exp.paidBy] = (net[exp.paidBy] ?? 0) + toCents(exp.amount);
    for (const [uid, owed] of Object.entries(exp.shares)) {
      net[uid] = (net[uid] ?? 0) - toCents(owed);
    }
  }

  for (const s of settlements) {
    // payer (from) reduces their debt => their net goes up
    net[s.fromUid] = (net[s.fromUid] ?? 0) + toCents(s.amount);
    net[s.toUid] = (net[s.toUid] ?? 0) - toCents(s.amount);
  }

  return memberUids.map((uid) => ({ uid, net: fromCents(net[uid] ?? 0) }));
}

/**
 * Greedy debt simplification: minimal set of "who pays whom" transfers.
 * Matches biggest creditor with biggest debtor repeatedly.
 */
export function simplifyDebts(balances: Balance[]): Debt[] {
  const creditors = balances
    .filter((b) => toCents(b.net) > 0)
    .map((b) => ({ uid: b.uid, c: toCents(b.net) }))
    .sort((a, b) => b.c - a.c);
  const debtors = balances
    .filter((b) => toCents(b.net) < 0)
    .map((b) => ({ uid: b.uid, c: -toCents(b.net) }))
    .sort((a, b) => b.c - a.c);

  const debts: Debt[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const give = Math.min(creditors[ci].c, debtors[di].c);
    if (give > 0) {
      debts.push({
        fromUid: debtors[di].uid,
        toUid: creditors[ci].uid,
        amount: fromCents(give),
      });
    }
    creditors[ci].c -= give;
    debtors[di].c -= give;
    if (creditors[ci].c === 0) ci++;
    if (debtors[di].c === 0) di++;
  }
  return debts;
}

/**
 * Your effect from one shared expense, in cents: positive = you lent
 * (others owe you), negative = you borrowed, 0 = not involved / even.
 */
export function myEffectCents(me: string, e: GroupExpense): number {
  const myShare = toCents(e.shares[me] ?? 0);
  if (e.paidBy === me) return toCents(e.amount) - myShare;
  return myShare === 0 ? 0 : -myShare; // avoid -0 ("−₹0" in the UI)
}

/**
 * Net between two people from their shared expenses + direct settlements,
 * Splitwise-style (pairwise, not group-simplified). Positive = `other`
 * owes `me`. Expenses paid by a third person don't move this pair.
 */
export function pairwiseNet(
  me: string,
  other: string,
  expenses: GroupExpense[],
  settlements: Settlement[],
): number {
  let c = 0;
  for (const e of expenses) {
    if (e.paidBy === me) c += toCents(e.shares[other] ?? 0);
    else if (e.paidBy === other) c -= toCents(e.shares[me] ?? 0);
  }
  for (const s of settlements) {
    if (s.fromUid === other && s.toUid === me) c -= toCents(s.amount);
    else if (s.fromUid === me && s.toUid === other) c += toCents(s.amount);
  }
  return fromCents(c);
}

/** True when an expense touches both people (one paid, the other owes). */
export function involvesPair(me: string, other: string, e: GroupExpense) {
  return (
    (e.paidBy === me && (e.shares[other] ?? 0) > 0) ||
    (e.paidBy === other && (e.shares[me] ?? 0) > 0)
  );
}
