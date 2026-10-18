import { describe, it, expect } from "vitest";
import { resolveSplit, validateSplit } from "./splitCalc";
import { computeBalances, simplifyDebts } from "./balances";
import type { GroupExpense } from "@/lib/types";

const sum = (r: Record<string, number>) =>
  Math.round(Object.values(r).reduce((a, b) => a + b, 0) * 100) / 100;

describe("resolveSplit", () => {
  it("equal split divides evenly", () => {
    const r = resolveSplit(30, "equal", ["a", "b", "c"], {});
    expect(r).toEqual({ a: 10, b: 10, c: 10 });
  });

  it("equal split distributes leftover cents deterministically", () => {
    const r = resolveSplit(10, "equal", ["a", "b", "c"], {});
    // 10 / 3 = 3.33.. -> 3.34, 3.33, 3.33
    expect(r.a).toBe(3.34);
    expect(r.b).toBe(3.33);
    expect(r.c).toBe(3.33);
    expect(sum(r)).toBe(10);
  });

  it("exact split uses given amounts", () => {
    const r = resolveSplit(50, "exact", ["a", "b"], { a: 20, b: 30 });
    expect(r).toEqual({ a: 20, b: 30 });
  });

  it("percent split allocates by percentage and reconciles", () => {
    const r = resolveSplit(100, "percent", ["a", "b", "c"], {
      a: 50,
      b: 30,
      c: 20,
    });
    expect(r).toEqual({ a: 50, b: 30, c: 20 });
    expect(sum(r)).toBe(100);
  });

  it("percent split with rounding sums exactly to total", () => {
    const r = resolveSplit(100, "percent", ["a", "b", "c"], {
      a: 33.33,
      b: 33.33,
      c: 33.34,
    });
    expect(sum(r)).toBe(100);
  });

  it("shares split weights by ratio (2:1:1)", () => {
    const r = resolveSplit(100, "shares", ["a", "b", "c"], {
      a: 2,
      b: 1,
      c: 1,
    });
    expect(r).toEqual({ a: 50, b: 25, c: 25 });
    expect(sum(r)).toBe(100);
  });

  it("shares split reconciles odd totals", () => {
    const r = resolveSplit(100, "shares", ["a", "b", "c"], {
      a: 1,
      b: 1,
      c: 1,
    });
    expect(sum(r)).toBe(100);
  });

  it("adjustment split applies +/- deltas over equal base", () => {
    // 90 equal = 30 each; b owes +6, others absorb the -6.
    const r = resolveSplit(90, "adjustment", ["a", "b", "c"], { b: 6 });
    expect(sum(r)).toBe(90);
    expect(r.b).toBeGreaterThan(r.a);
  });

  it("always sums to total across fuzzed amounts", () => {
    for (const total of [0.01, 7.77, 99.99, 12345.67]) {
      const r = resolveSplit(total, "equal", ["a", "b", "c", "d"], {});
      expect(sum(r)).toBe(Math.round(total * 100) / 100);
    }
  });
});

describe("validateSplit", () => {
  it("rejects exact that does not sum to total", () => {
    expect(validateSplit(50, "exact", ["a", "b"], { a: 20, b: 20 }).ok).toBe(
      false,
    );
    expect(validateSplit(50, "exact", ["a", "b"], { a: 20, b: 30 }).ok).toBe(
      true,
    );
  });

  it("rejects percent that does not sum to 100", () => {
    expect(
      validateSplit(50, "percent", ["a", "b"], { a: 40, b: 40 }).ok,
    ).toBe(false);
    expect(
      validateSplit(50, "percent", ["a", "b"], { a: 60, b: 40 }).ok,
    ).toBe(true);
  });

  it("rejects negative inputs for exact/percent/shares", () => {
    expect(
      validateSplit(50, "exact", ["a", "b"], { a: -10, b: 60 }).ok,
    ).toBe(false);
    expect(
      validateSplit(50, "percent", ["a", "b"], { a: 150, b: -50 }).ok,
    ).toBe(false);
    expect(
      validateSplit(50, "shares", ["a", "b"], { a: -1, b: 3 }).ok,
    ).toBe(false);
  });

  it("rejects adjustments that push a share below zero", () => {
    // 30 equal = 10 each; +100 on b drives a and c negative.
    expect(
      validateSplit(30, "adjustment", ["a", "b", "c"], { b: 100 }).ok,
    ).toBe(false);
    expect(
      validateSplit(30, "adjustment", ["a", "b", "c"], { b: 6 }).ok,
    ).toBe(true);
  });

  it("rejects an empty member list", () => {
    expect(validateSplit(50, "equal", [], {}).ok).toBe(false);
  });
});

describe("computeBalances + simplifyDebts", () => {
  const mkExp = (
    id: string,
    amount: number,
    paidBy: string,
    shares: Record<string, number>,
  ): GroupExpense => ({
    id,
    amount,
    categoryId: "c",
    date: "2026-01-01",
    createdAt: 0,
    paidBy,
    splitType: "equal",
    splitInput: {},
    shares,
    createdBy: paidBy,
  });

  it("A pays 30 split equally among 3 -> B and C each owe 10", () => {
    const exp = mkExp("1", 30, "a", { a: 10, b: 10, c: 10 });
    const bal = computeBalances(["a", "b", "c"], [exp], []);
    const byUid = Object.fromEntries(bal.map((b) => [b.uid, b.net]));
    expect(byUid.a).toBe(20);
    expect(byUid.b).toBe(-10);
    expect(byUid.c).toBe(-10);
  });

  it("settlement zeroes out a debt", () => {
    const exp = mkExp("1", 30, "a", { a: 10, b: 10, c: 10 });
    const settle = {
      id: "s1",
      fromUid: "b",
      toUid: "a",
      amount: 10,
      date: "2026-01-02",
      createdAt: 0,
    };
    const bal = computeBalances(["a", "b", "c"], [exp], [settle]);
    const byUid = Object.fromEntries(bal.map((b) => [b.uid, b.net]));
    expect(byUid.b).toBe(0);
    expect(byUid.a).toBe(10);
  });

  it("simplifyDebts produces reconciling transfers", () => {
    const exp = mkExp("1", 30, "a", { a: 10, b: 10, c: 10 });
    const debts = simplifyDebts(computeBalances(["a", "b", "c"], [exp], []));
    const total = debts.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(20);
    expect(debts.every((d) => d.toUid === "a")).toBe(true);
  });
});

import {
  myEffectCents,
  pairwiseNet,
  involvesPair,
} from "./balances";

describe("pairwise / friend balances", () => {
  const mk = (
    id: string,
    amount: number,
    paidBy: string,
    shares: Record<string, number>,
  ): GroupExpense => ({
    id,
    amount,
    categoryId: "c",
    date: "2026-01-01",
    createdAt: 0,
    paidBy,
    splitType: "equal",
    splitInput: {},
    shares,
    createdBy: paidBy,
  });

  it("my effect: lent when I paid, borrowed when someone else did", () => {
    const e = mk("1", 25, "me", { me: 12.5, neha: 12.5 });
    expect(myEffectCents("me", e)).toBe(1250); // Neha owes me 12.50
    expect(myEffectCents("neha", e)).toBe(-1250);
    expect(myEffectCents("x", e)).toBe(0); // not involved
  });

  it("pairwise net nets expenses both ways and settlements", () => {
    const exps = [
      mk("1", 25, "me", { me: 12.5, neha: 12.5 }), // neha owes me 12.5
      mk("2", 40, "neha", { me: 20, neha: 20 }), // I owe neha 20
      mk("3", 90, "rahul", { me: 30, neha: 30, rahul: 30 }), // third party
    ];
    expect(pairwiseNet("me", "neha", exps, [])).toBe(-7.5);
    const settle = [
      { id: "s", fromUid: "me", toUid: "neha", amount: 7.5, date: "x", createdAt: 0 },
    ];
    expect(pairwiseNet("me", "neha", exps, settle)).toBe(0);
    expect(involvesPair("me", "neha", exps[2])).toBe(false);
  });
});
