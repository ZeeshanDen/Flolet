import { X, IndianRupee } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { monthlyCost, scheduleLabel } from "@/features/meds/medsCalc";
import { formatMoney } from "@/lib/utils";
import type { Medicine } from "@/lib/types";

/**
 * Monthly medicine spend: per-medicine 30-day consumption cost from pack
 * pricing, with the you-pay total vs MRP total and the saving.
 */
export default function CostSheet({
  open,
  onClose,
  medicines,
}: {
  open: boolean;
  onClose: () => void;
  medicines: Medicine[];
}) {
  const rows = medicines.map((m) => ({ med: m, ...monthlyCost(m) }));
  const priced = rows.filter((r) => r.cost !== null);
  const unpriced = rows.filter((r) => r.cost === null);
  const total = priced.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalMrp = priced.reduce(
    (s, r) => s + (r.mrpCost ?? r.cost ?? 0),
    0,
  );
  const saving = Math.max(0, totalMrp - total);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Monthly medicine cost</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted"
        >
          <X size={18} />
        </button>
      </div>

      {priced.length === 0 ? (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-center">
          <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand-soft">
            <IndianRupee size={20} />
          </span>
          <p className="font-semibold">No pricing yet</p>
          <p className="mt-1 text-sm text-muted">
            Open a medicine and fill "Pricing per pack" — this view then shows
            what a month of medicines costs you.
          </p>
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="mb-4 rounded-2xl border border-brand/25 bg-brand/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              You pay / month
            </p>
            <p className="mt-0.5 text-3xl font-extrabold tracking-tight">
              {formatMoney(total, "INR")}
            </p>
            {saving > 0 && (
              <p className="mt-1 text-sm text-muted">
                MRP {formatMoney(totalMrp, "INR")} — you save{" "}
                <span className="font-bold text-good">
                  {formatMoney(saving, "INR")}
                </span>{" "}
                ({Math.round((saving / totalMrp) * 100)}%)
              </p>
            )}
          </div>

          <div className="mb-4 space-y-2">
            {priced
              .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
              .map((r) => (
                <div
                  key={r.med.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.med.name}</p>
                    <p className="text-xs text-muted">
                      {scheduleLabel(r.med)} · ~{Math.round(r.units)}/mo
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">
                      {formatMoney(r.cost ?? 0, "INR")}
                    </p>
                    {r.mrpCost !== null && r.mrpCost > (r.cost ?? 0) && (
                      <p className="text-xs text-muted line-through">
                        {formatMoney(r.mrpCost, "INR")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {unpriced.length > 0 && priced.length > 0 && (
        <p className="mb-2 text-xs text-muted">
          Not counted (no pricing set):{" "}
          {unpriced.map((r) => r.med.name).join(", ")}
        </p>
      )}
    </BottomSheet>
  );
}
