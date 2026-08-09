import { describe, it, expect } from "vitest";
import {
  consumedDoses,
  remainingUnits,
  runOutDate,
  daysLeft,
  scheduleLabel,
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
