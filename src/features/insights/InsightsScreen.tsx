import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";
import { format, addMonths, addYears } from "date-fns";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { useExpenses } from "@/features/expenses/useExpenses";
import { useCategories } from "@/features/categories/useCategories";
import { useProfile } from "@/features/profile/useProfile";
import {
  categoryBreakdown,
  dailyBuckets,
  monthlyBuckets,
  inPeriod,
  sumAmount,
} from "@/features/insights/aggregate";
import { formatMoney, cn } from "@/lib/utils";

type View = "month" | "year";

// Theme-aware chart chrome — hardcoded dark hexes were unreadable in light mode.
const tooltipStyle = {
  background: "rgb(var(--card))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 12,
  color: "rgb(var(--text))",
} as const;
const tooltipItemStyle = { color: "rgb(var(--text))" } as const;

export default function InsightsScreen() {
  const { expenses } = useExpenses();
  const { categories } = useCategories();
  const { currency } = useProfile();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());

  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const prefix =
    view === "month" ? format(cursor, "yyyy-MM") : format(cursor, "yyyy");
  const prevPrefix =
    view === "month"
      ? format(addMonths(cursor, -1), "yyyy-MM")
      : format(addYears(cursor, -1), "yyyy");

  const periodExpenses = useMemo(
    () => expenses.filter((e) => inPeriod(e, prefix)),
    [expenses, prefix],
  );
  const prevExpenses = useMemo(
    () => expenses.filter((e) => inPeriod(e, prevPrefix)),
    [expenses, prevPrefix],
  );

  const total = sumAmount(periodExpenses);
  const prevTotal = sumAmount(prevExpenses);
  const delta = prevTotal === 0 ? 0 : ((total - prevTotal) / prevTotal) * 100;

  const slices = useMemo(
    () => categoryBreakdown(periodExpenses, catById),
    [periodExpenses, catById],
  );
  const buckets = useMemo(
    () =>
      view === "month"
        ? dailyBuckets(periodExpenses)
        : monthlyBuckets(periodExpenses),
    [periodExpenses, view],
  );

  const step = (dir: number) =>
    setCursor((c) =>
      view === "month" ? addMonths(c, dir) : addYears(c, dir),
    );

  const label =
    view === "month" ? format(cursor, "MMMM yyyy") : format(cursor, "yyyy");

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-xl font-bold">Insights</h1>

      {/* View toggle */}
      <div className="mb-4 flex gap-2">
        {(["month", "year"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "flex-1 rounded-xl py-2 text-sm font-medium capitalize transition",
              view === v ? "bg-brand text-on-brand" : "bg-card text-muted",
            )}
          >
            {v === "month" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>

      {/* Period nav */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => step(-1)}
          aria-label="Previous period"
          className="p-2 text-muted"
        >
          <ChevronLeft />
        </button>
        <span className="font-semibold">{label}</span>
        <button
          onClick={() => step(1)}
          aria-label="Next period"
          className="p-2 text-muted"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Total + comparison */}
      <div className="card mb-4 text-center">
        <p className="text-sm text-muted">Total spent</p>
        <p className="text-3xl font-bold">{formatMoney(total, currency)}</p>
        {prevTotal > 0 && (
          <p
            className={cn(
              "mt-1 flex items-center justify-center gap-1 text-sm",
              delta > 0 ? "text-bad" : "text-good",
            )}
          >
            {delta > 0 ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            {Math.abs(delta).toFixed(0)}% vs last {view}
          </p>
        )}
      </div>

      {periodExpenses.length === 0 ? (
        <p className="mt-10 text-center text-muted">
          No spending in this period.
        </p>
      ) : (
        <>
          {/* Category donut */}
          <div className="card mb-4">
            <p className="mb-2 text-sm text-muted">By category</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {slices.map((s) => (
                      <Cell key={s.categoryId} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatMoney(v, currency)}
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {slices.map((s) => (
                <div
                  key={s.categoryId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.name}
                  </span>
                  <span className="tabular-nums text-muted">
                    {formatMoney(s.value, currency)}{" "}
                    <span className="text-xs">
                      ({((s.value / total) * 100).toFixed(0)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Spend over time */}
          <div className="card mb-4">
            <p className="mb-2 text-sm text-muted">
              {view === "month" ? "Daily spend" : "Monthly spend"}
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgb(var(--muted))", fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <Tooltip
                    formatter={(v: number) => formatMoney(v, currency)}
                    cursor={{ fill: "rgb(var(--text) / 0.06)" }}
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                  />
                  <Bar dataKey="total" fill="rgb(var(--brand-soft))" radius={[6, 6, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
