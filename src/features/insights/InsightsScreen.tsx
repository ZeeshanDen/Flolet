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
    <div className="space-y-3 px-4 pt-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight">Insights</h1>
        <div className="flex rounded-full bg-raised p-1 text-[12px] font-semibold">
          {(["month", "year"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-3 py-1.5 transition",
                view === v ? "bg-card text-text shadow-card" : "text-muted",
              )}
            >
              {v === "month" ? "Month" : "Year"}
            </button>
          ))}
        </div>
      </div>

      {/* Hero total: period, amount, change vs previous */}
      <div className="hero-card px-5 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-[rgb(var(--hero-muted))]">
            Spent in {label}
          </span>
          <div className="-mr-2 flex">
            <button
              onClick={() => step(-1)}
              aria-label="Previous period"
              className="flex h-8 w-8 items-center justify-center rounded-full"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => step(1)}
              aria-label="Next period"
              className="flex h-8 w-8 items-center justify-center rounded-full"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="mt-0.5 text-[38px] font-bold leading-tight tabular-nums tracking-[-0.035em]">
          {formatMoney(total, currency)}
        </div>
        {prevTotal > 0 && (
          <span className="hero-chip mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold">
            {delta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(delta).toFixed(0)}% {delta > 0 ? "more" : "less"} than
            last {view}
          </span>
        )}
      </div>

      {periodExpenses.length === 0 ? (
        <p className="pt-8 text-center text-muted">
          No spending in this period.
        </p>
      ) : (
        <>
          {/* Category donut with centred total + proportion rows */}
          <div className="card">
            <p className="mb-1 text-[12px] font-semibold text-muted">
              By category
            </p>
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={84}
                    paddingAngle={2}
                    cornerRadius={4}
                    stroke="none"
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
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] font-medium text-muted">
                  {slices.length} categories
                </span>
                <span className="text-[18px] font-bold tabular-nums tracking-tight">
                  {slices[0]?.name}
                </span>
                <span className="text-[11px] text-muted">biggest</span>
              </div>
            </div>
            <div className="mt-2 space-y-3">
              {slices.map((s) => {
                const pct = total > 0 ? (s.value / total) * 100 : 0;
                return (
                  <div key={s.categoryId}>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: s.color }}
                        />
                        <span className="truncate">{s.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(s.value, currency)}
                        <span className="ml-1.5 text-[11px] font-medium text-muted">
                          {pct.toFixed(0)}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: s.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spend over time */}
          <div className="card">
            <p className="mb-2 text-[12px] font-semibold text-muted">
              {view === "month" ? "Daily spend" : "Monthly spend"}
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
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
