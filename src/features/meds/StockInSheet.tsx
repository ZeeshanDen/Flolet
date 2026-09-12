import { useEffect, useMemo, useState } from "react";
import { X, Minus, Plus, PackagePlus, Check } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { useMedicines } from "@/features/meds/useMedicines";
import {
  remainingUnits,
  unitsShort,
  todayIso,
} from "@/features/meds/medsCalc";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { Medicine } from "@/lib/types";

/**
 * Bulk stock-in after a pharmacy run: every medicine listed with the bought
 * quantity prefilled from its 30-day shortfall — tweak counts, confirm once,
 * and each medicine's stock updates (remaining + added, clock restarted).
 */
export default function StockInSheet({
  open,
  onClose,
  medicines,
}: {
  open: boolean;
  onClose: () => void;
  medicines: Medicine[];
}) {
  const { updateMedicine } = useMedicines();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill with each medicine's 30-day shortfall (0 when stocked up).
  useEffect(() => {
    if (!open) return;
    const till = format(addDays(new Date(), 30), "yyyy-MM-dd");
    const initial: Record<string, number> = {};
    for (const m of medicines) initial[m.id] = unitsShort(m, till);
    setQty(initial);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const rows = useMemo(
    () =>
      [...medicines].sort(
        (a, b) => (qty[b.id] ?? 0) - (qty[a.id] ?? 0),
      ),
    [medicines, qty],
  );

  const bump = (id: string, delta: number) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));
  const setExact = (id: string, v: string) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, parseFloat(v) || 0) }));

  const count = Object.values(qty).filter((n) => n > 0).length;

  const confirm = async () => {
    if (busy || count === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const m of medicines) {
        const add = qty[m.id] ?? 0;
        if (add <= 0) continue;
        await updateMedicine(m.id, {
          stock: remainingUnits(m) + add,
          stockAsOf: todayIso(),
        });
      }
      onClose();
    } catch (e) {
      console.error("stock in", e);
      setError("Some updates failed — check and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Stock in</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted"
        >
          <X size={18} />
        </button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Counts are prefilled with what a 30-day top-up needs. Adjust to what
        you actually bought, then confirm — everything updates in one go.
      </p>

      <div className="mb-4 space-y-2">
        {rows.map((m) => {
          const n = qty[m.id] ?? 0;
          return (
            <div
              key={m.id}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-2.5",
                n === 0 && "opacity-45",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.name}</p>
                <p className="text-xs text-muted">
                  {remainingUnits(m)} left now
                </p>
              </div>
              <button
                onClick={() => bump(m.id, -1)}
                aria-label={`Less ${m.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-muted"
              >
                <Minus size={15} />
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={n}
                onChange={(e) => setExact(m.id, e.target.value)}
                aria-label={`${m.name} quantity`}
                className="w-14 rounded-xl border border-border bg-surface py-1.5 text-center font-bold tabular-nums outline-none focus:border-brand"
              />
              <button
                onClick={() => bump(m.id, 1)}
                aria-label={`More ${m.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-muted"
              >
                <Plus size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="mb-3 text-sm text-bad">{error}</p>}

      <button
        onClick={confirm}
        disabled={busy || count === 0}
        className="btn-brand w-full disabled:bg-border disabled:text-muted"
      >
        {busy ? (
          "Updating…"
        ) : (
          <>
            {count === 0 ? <PackagePlus size={18} /> : <Check size={18} />}
            {count === 0
              ? "Nothing to stock in"
              : `Add stock to ${count} medicine${count === 1 ? "" : "s"}`}
          </>
        )}
      </button>
    </BottomSheet>
  );
}
