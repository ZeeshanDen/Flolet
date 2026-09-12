import { describe, it, expect } from "vitest";
import {
  consumedDoses,
  remainingUnits,
  runOutDate,
  daysLeft,
  scheduleLabel,
  unitsNeededBetween,
  unitsShort,
  monthlyCost,
} from "./medsCalc";
import type { Medicine } from "@/lib/types";

const base: Omit<Medicine, "schedule"> = {
  id: "m1",
  name: "Test",
  unit: "tablet",
  unitsPerDose: 1,
  stock: 20,
  stockAsOf: "2026-07-01",
  createdAt: 0,
};

const daily = (slots: Medicine["schedule"] extends infer _ ? string[] : never) =>
  ({ type: "daily", slots }) as Medicine["schedule"];

describe("medsCalc", () => {
  it("3x/day burns three doses per day", () => {
    const med: Medicine = { ...base, schedule: daily(["morning", "afternoon", "night"]) };
    expect(consumedDoses(med, "2026-07-04")).toBe(9);
    expect(remainingUnits(med, "2026-07-04")).toBe(11);
  });

  it("night-only burns one per day", () => {
    const med: Medicine = { ...base, schedule: daily(["night"]) };
    expect(remainingUnits(med, "2026-07-11")).toBe(10);
    expect(runOutDate(med)).toBe("2026-07-21");
  });

  it("2x/day runs out in stock/2 days", () => {
    const med: Medicine = { ...base, schedule: daily(["morning", "night"]) };
    expect(runOutDate(med)).toBe("2026-07-11"); // 20 doses / 2 per day = 10 days
    expect(daysLeft(med, "2026-07-01")).toBe(10);
  });

  it("weekly Monday injection: consumption counts Mondays only", () => {
    // 2026-07-01 is a Wednesday; Mondays after: Jul 6, 13, 20, 27...
    const med: Medicine = {
      ...base,
      stock: 3,
      schedule: { type: "weekly", weekday: 1 },
    };
    expect(consumedDoses(med, "2026-07-05")).toBe(0);
    expect(consumedDoses(med, "2026-07-06")).toBe(1);
    expect(consumedDoses(med, "2026-07-19")).toBe(2);
    expect(consumedDoses(med, "2026-07-20")).toBe(3);
  });

  it("weekly run-out lands the day after the final scheduled weekday", () => {
    const med: Medicine = {
      ...base,
      stock: 3,
      schedule: { type: "weekly", weekday: 1 },
    };
    // 3 doses cover Jul 6, 13, 20 → out on the 21st.
    expect(runOutDate(med)).toBe("2026-07-21");
  });

  it("unitsPerDose > 1 halves the doses", () => {
    const med: Medicine = {
      ...base,
      unitsPerDose: 2,
      schedule: daily(["morning"]),
    };
    expect(runOutDate(med)).toBe("2026-07-11"); // 20 units / 2 per dose = 10 days
    expect(remainingUnits(med, "2026-07-05")).toBe(12);
  });

  it("exhausted stock reports zero remaining and zero days", () => {
    const med: Medicine = { ...base, stock: 4, schedule: daily(["morning", "night"]) };
    expect(remainingUnits(med, "2026-07-10")).toBe(0);
    expect(daysLeft(med, "2026-07-10")).toBe(0);
  });

  it("stockAsOf in the future consumes nothing", () => {
    const med: Medicine = { ...base, schedule: daily(["morning"]) };
    expect(consumedDoses(med, "2026-06-20")).toBe(0);
    expect(remainingUnits(med, "2026-06-20")).toBe(20);
  });

  it("order math: daily needs are inclusive of both end days", () => {
    const med: Medicine = { ...base, schedule: daily(["morning", "night"]) };
    // 1st..10th inclusive = 10 days × 2 doses = 20 units
    expect(unitsNeededBetween(med, "2026-07-01", "2026-07-10")).toBe(20);
    expect(unitsNeededBetween(med, "2026-07-01", "2026-07-01")).toBe(2);
  });

  it("order math: weekly counts scheduled weekdays inclusive", () => {
    const med: Medicine = { ...base, schedule: { type: "weekly", weekday: 1 } };
    // Mondays in Jul 6..Jul 20 inclusive: 6, 13, 20 → 3 doses
    expect(unitsNeededBetween(med, "2026-07-06", "2026-07-20")).toBe(3);
  });

  it("order math: shortage subtracts remaining stock and never goes negative", () => {
    // 2/day, stock 20 on Jul 1 → 4 left on Jul 9 (8 days × 2 = 16 used)
    const med: Medicine = { ...base, schedule: daily(["morning", "night"]) };
    // Jul 9..Jul 18 inclusive = 10 days × 2 = 20 needed, 4 left → buy 16
    expect(unitsShort(med, "2026-07-18", "2026-07-09")).toBe(16);
    // Big stock → nothing to buy
    expect(
      unitsShort({ ...med, stock: 100 }, "2026-07-18", "2026-07-09"),
    ).toBe(0);
  });

  it("monthly cost scales pack price by consumption", () => {
    // 2/day = 60 units/mo; 15-tab strip at ₹90 paid, ₹120 MRP → 4 strips
    const med: Medicine = {
      ...base,
      schedule: daily(["morning", "night"]),
      packUnits: 15,
      packPrice: 90,
      packMrp: 120,
    };
    expect(monthlyCost(med)).toEqual({ units: 60, cost: 360, mrpCost: 480 });
    // No pricing → nulls
    expect(monthlyCost({ ...base, schedule: daily(["night"]) }).cost).toBeNull();
  });

  it("labels read naturally", () => {
    expect(
      scheduleLabel({ ...base, schedule: daily(["morning", "night"]) }),
    ).toBe("Morning + Night · 2×/day");
    expect(
      scheduleLabel({
        ...base,
        schedule: daily(["morning", "afternoon", "night"]),
      }),
    ).toBe("3 times · 3×/day");
    expect(
      scheduleLabel({ ...base, schedule: { type: "weekly", weekday: 1 } }),
    ).toBe("Weekly · Mon");
  });
});
