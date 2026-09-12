import { useEffect, useMemo, useState } from "react";
import { X, Copy, Check, Share2, Minus, Plus, ClipboardList } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import BottomSheet from "@/components/BottomSheet";
import {
  remainingUnits,
  unitsShort,
  orderUnitLabel,
  todayIso,
} from "@/features/meds/medsCalc";
import { cn } from "@/lib/utils";
import type { Medicine } from "@/lib/types";

/**
 * Build a pharmacy order: pick a "stock up till" date, get per-medicine
 * shortfalls (schedule-aware, minus stock on hand), tweak quantities, then
 * copy or share the list ("Nicardia XL 30 x 40 tabs") to WhatsApp.
 */
export default function OrderSheet({
  open,
  onClose,
  medicines,
}: {
  open: boolean;
  onClose: () => void;
  medicines: Medicine[];
}) {
  const defaultTill = () => format(addDays(new Date(), 30), "yyyy-MM-dd");
  const [till, setTill] = useState(defaultTill);
  // Quantity overrides keyed by medicine id; unset = computed shortfall.
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTill(defaultTill());
    setOverrides({});
    setCopied(false);
  }, [open]);

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(till) && till >= todayIso();

  const rows = useMemo(() => {
    if (!dateOk) return [];
    return medicines
      .map((m) => ({
        med: m,
        short: unitsShort(m, till),
        left: remainingUnits(m),
      }))
      .filter((r) => r.short > 0)
      .sort((a, b) => b.short - a.short);
  }, [medicines, till, dateOk]);

  const qtyOf = (id: string, computed: number) => overrides[id] ?? computed;
  const bump = (id: string, computed: number, delta: number) =>
    setOverrides((o) => ({
      ...o,
      [id]: Math.max(0, qtyOf(id, computed) + delta),
    }));

  const orderLines = rows
    .map((r) => ({ r, qty: qtyOf(r.med.id, r.short) }))
    .filter((x) => x.qty > 0)
    .map(
      (x) => `${x.r.med.name} x ${x.qty} ${orderUnitLabel(x.r.med.unit, x.qty)}`,
    );

  const orderText =
    `Medicines (till ${format(parseISO(till), "d MMM")}):\n` +
    orderLines.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("copy order", e);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ text: orderText });
    } catch {
      /* user cancelled or unsupported */
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Order medicines</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted"
        >
          <X size={18} />
        </button>
      </div>

      <label className="mb-1.5 block text-xs font-semibold text-muted">
        Stock up till
      </label>
      <input
        type="date"
        className="input mb-4"
        value={till}
        min={todayIso()}
        onChange={(e) => setTill(e.target.value)}
        aria-label="Stock up till date"
      />

      {!dateOk ? (
        <p className="mb-4 text-sm text-bad">Pick a date from today onward.</p>
      ) : rows.length === 0 ? (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-semibold text-good">All stocked up</p>
          <p className="mt-1 text-sm text-muted">
            Every medicine lasts past {format(parseISO(till), "d MMM")} —
            nothing to order.
          </p>
        </div>
      ) : (
        <div className="mb-4 space-y-2">
          {rows.map(({ med, short, left }) => {
            const qty = qtyOf(med.id, short);
            return (
              <div
                key={med.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5",
                  qty === 0 && "opacity-45",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{med.name}</p>
                  <p className="text-xs text-muted">
                    {left} left · needs {short} more
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => bump(med.id, short, -1)}
                    aria-label={`Less ${med.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-muted"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-12 text-center font-bold tabular-nums">
                    {qty}
                  </span>
                  <button
                    onClick={() => bump(med.id, short, 1)}
                    aria-label={`More ${med.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-muted"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {orderLines.length > 0 && (
        <>
          <div className="mb-4 whitespace-pre-wrap rounded-2xl border border-border bg-surface p-3.5 font-mono text-sm leading-relaxed">
            {orderText}
          </div>
          <div className="flex gap-3">
            <button onClick={copy} className="btn-ghost flex-1">
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? "Copied" : "Copy"}
            </button>
            {typeof navigator.share === "function" && (
              <button onClick={share} className="btn-brand flex-1">
                <Share2 size={18} />
                Share
              </button>
            )}
          </div>
        </>
      )}

      {rows.length === 0 && dateOk && (
        <button onClick={onClose} className="btn-brand w-full">
          <ClipboardList size={18} />
          Done
        </button>
      )}
    </BottomSheet>
  );
}
