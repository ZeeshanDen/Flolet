import type { SplitType } from "@/lib/types";
import { toCents, fromCents } from "@/lib/utils";

/**
 * Resolve a split into exact owed amounts per member.
 * Guarantees Σ(result) === total, with leftover cents distributed
 * deterministically so balances always reconcile.
 *
 * @param total      expense total (major units)
 * @param type       split type
 * @param members    ordered member uids participating
 * @param input      raw per-member input keyed by uid:
 *                     equal      -> ignored
 *                     exact      -> owed amount
 *                     percent    -> percentage (0-100)
 *                     shares     -> weight (>=0)
 *                     adjustment -> +/- delta on equal base
 */
export function resolveSplit(
  total: number,
  type: SplitType,
  members: string[],
  input: Record<string, number>,
): Record<string, number> {
  const totalC = toCents(total);
  const n = members.length;
  if (n === 0) return {};

  let centsByUid: Record<string, number>;

  switch (type) {
    case "equal": {
      centsByUid = distributeEvenly(totalC, members);
      break;
    }
    case "exact": {
      centsByUid = {};
      for (const uid of members) centsByUid[uid] = toCents(input[uid] ?? 0);
      // Force reconciliation to total (guard against input drift).
      reconcile(centsByUid, members, totalC);
      break;
    }
    case "percent": {
      const raw = members.map((uid) => (totalC * (input[uid] ?? 0)) / 100);
      centsByUid = allocateRounded(raw, members, totalC);
      break;
    }
    case "shares": {
      const weights = members.map((uid) => Math.max(0, input[uid] ?? 0));
      const sum = weights.reduce((a, b) => a + b, 0);
      if (sum <= 0) {
        centsByUid = distributeEvenly(totalC, members);
      } else {
        const raw = weights.map((w) => (totalC * w) / sum);
        centsByUid = allocateRounded(raw, members, totalC);
      }
      break;
    }
    case "adjustment": {
      // Each adjustment shifts that member's share; the equal base absorbs the
      // rest so the whole still sums to total.
      const adjC = members.map((uid) => toCents(input[uid] ?? 0));
      const adjSum = adjC.reduce((a, b) => a + b, 0);
      const base = distributeEvenlyList(totalC - adjSum, n);
      centsByUid = {};
      members.forEach((uid, i) => {
        centsByUid[uid] = base[i] + adjC[i];
      });
      reconcile(centsByUid, members, totalC);
      break;
    }
  }

  const out: Record<string, number> = {};
  for (const uid of members) out[uid] = fromCents(centsByUid[uid] ?? 0);
  return out;
}

/** Split an integer cent amount as evenly as possible; extra cents go to earliest members. */
function distributeEvenlyList(totalC: number, n: number): number[] {
  if (n === 0) return [];
  const base = Math.floor(totalC / n);
  let remainder = totalC - base * n; // can be negative if totalC < 0
  const step = remainder >= 0 ? 1 : -1;
  remainder = Math.abs(remainder);
  const arr = new Array(n).fill(base);
  for (let i = 0; i < remainder; i++) arr[i] += step;
  return arr;
}

function distributeEvenly(
  totalC: number,
  members: string[],
): Record<string, number> {
  const list = distributeEvenlyList(totalC, members.length);
  const out: Record<string, number> = {};
  members.forEach((uid, i) => (out[uid] = list[i]));
  return out;
}

/** Round raw fractional cents to integers, then fix rounding drift against target. */
function allocateRounded(
  raw: number[],
  members: string[],
  totalC: number,
): Record<string, number> {
  const rounded = raw.map((r) => Math.round(r));
  const out: Record<string, number> = {};
  members.forEach((uid, i) => (out[uid] = rounded[i]));
  reconcile(out, members, totalC);
  return out;
}

/** Adjust members so the sum equals target, nudging one cent at a time. */
function reconcile(
  centsByUid: Record<string, number>,
  members: string[],
  totalC: number,
): void {
  let diff =
    totalC - members.reduce((s, uid) => s + (centsByUid[uid] ?? 0), 0);
  let i = 0;
  const step = diff >= 0 ? 1 : -1;
  diff = Math.abs(diff);
  while (diff > 0 && members.length > 0) {
    const uid = members[i % members.length];
    centsByUid[uid] = (centsByUid[uid] ?? 0) + step;
    diff--;
    i++;
  }
}

/** True when a split's inputs are valid for its type. */
export function validateSplit(
  total: number,
  type: SplitType,
  members: string[],
  input: Record<string, number>,
): { ok: boolean; message?: string } {
  if (members.length === 0)
    return { ok: false, message: "Pick at least one person" };

  if (type === "exact") {
    const sum = members.reduce((s, uid) => s + (input[uid] ?? 0), 0);
    if (toCents(sum) !== toCents(total))
      return {
        ok: false,
        message: `Amounts must add up to ${total.toFixed(2)} (now ${sum.toFixed(2)})`,
      };
  }
  if (type === "percent") {
    const sum = members.reduce((s, uid) => s + (input[uid] ?? 0), 0);
    if (Math.round(sum * 100) !== 10000)
      return { ok: false, message: `Percentages must add up to 100% (now ${sum}%)` };
  }
  if (type === "shares") {
    const sum = members.reduce((s, uid) => s + (input[uid] ?? 0), 0);
    if (sum <= 0) return { ok: false, message: "Total shares must be > 0" };
  }
  return { ok: true };
}
