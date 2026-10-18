import { useMemo, useState } from "react";
import {
  Plus,
  Pill,
  AlertTriangle,
  ClipboardList,
  PackagePlus,
  MoreVertical,
  IndianRupee,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMedicines } from "@/features/meds/useMedicines";
import { usePersons } from "@/features/meds/usePersons";
import {
  remainingUnits,
  runOutDate,
  daysLeft,
  scheduleLabel,
} from "@/features/meds/medsCalc";
import MedicineSheet from "@/features/meds/MedicineSheet";
import OrderSheet from "@/features/meds/OrderSheet";
import StockInSheet from "@/features/meds/StockInSheet";
import CostSheet from "@/features/meds/CostSheet";
import { cn } from "@/lib/utils";
import type { Medicine } from "@/lib/types";

function statusColor(days: number) {
  if (days <= 5) return { text: "text-bad", bg: "bg-bad/15", bar: "#f43f5e" };
  if (days <= 14)
    return { text: "text-[#eab308]", bg: "bg-[#eab308]/15", bar: "#eab308" };
  return { text: "text-good", bg: "bg-good/15", bar: "#10b981" };
}

function MedCard({
  med,
  personName,
  onTap,
}: {
  med: Medicine;
  personName?: string;
  onTap: (m: Medicine) => void;
}) {
  const remaining = remainingUnits(med);
  const days = daysLeft(med);
  const out = remaining <= 0;
  const c = statusColor(days);
  const pct = med.stock > 0 ? Math.min(100, (remaining / med.stock) * 100) : 0;

  return (
    <button
      onClick={() => onTap(med)}
      className="w-full rounded-2xl border border-border bg-card p-3.5 text-left transition active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            c.bg,
            c.text,
          )}
        >
          <Pill size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{med.name}</p>
          <p className="truncate text-xs text-muted">
            {personName ? `${personName} · ` : ""}
            {scheduleLabel(med)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold",
              c.bg,
              c.text,
            )}
          >
            {out ? "Out of stock" : days === 0 ? "Last day" : `${days}d left`}
          </span>
          <p className="mt-1 text-xs text-muted">
            {out
              ? "refill now"
              : `${remaining} ${med.unit}${remaining === 1 ? "" : "s"} · till ${format(parseISO(runOutDate(med)), "d MMM")}`}
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: c.bar }}
        />
      </div>
    </button>
  );
}

export default function MedsScreen() {
  const { medicines, loading } = useMedicines();
  const { persons } = usePersons();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [filter, setFilter] = useState<string | null>(null); // personId or null = all

  const personById = useMemo(
    () => Object.fromEntries(persons.map((p) => [p.id, p.name])),
    [persons],
  );

  const sorted = useMemo(() => {
    const list = filter
      ? medicines.filter((m) => m.personId === filter)
      : medicines;
    return [...list].sort((a, b) => daysLeft(a) - daysLeft(b));
  }, [medicines, filter]);
  const refillSoon = sorted.filter((m) => daysLeft(m) <= 14);
  const healthy = sorted.filter((m) => daysLeft(m) > 14);
  // Show the person on cards only in the combined view.
  const nameFor = (m: Medicine) =>
    !filter && m.personId ? personById[m.personId] : undefined;

  const [orderOpen, setOrderOpen] = useState(false);
  const [stockInOpen, setStockInOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (m: Medicine) => {
    setEditing(m);
    setSheetOpen(true);
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Medicines</h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOrderOpen(true)}
            disabled={medicines.length === 0}
            aria-label="Order medicines"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-text disabled:opacity-40"
          >
            <ClipboardList size={19} />
          </button>
          <button
            onClick={() => setStockInOpen(true)}
            disabled={medicines.length === 0}
            aria-label="Stock in"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-text disabled:opacity-40"
          >
            <PackagePlus size={19} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More options"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-text"
            >
              <MoreVertical size={19} />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  aria-hidden="true"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 z-40 w-48 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setCostOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium"
                  >
                    <IndianRupee size={16} className="text-brand-soft" />
                    Monthly cost
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={openAdd} className="btn-brand px-3 py-2">
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      {persons.length > 0 && (
        <div className="noscroll mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
              filter === null
                ? "bg-brand text-on-brand"
                : "border border-border bg-surface text-muted",
            )}
          >
            Everyone
          </button>
          {persons.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilter(p.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                filter === p.id
                  ? "bg-brand text-on-brand"
                  : "border border-border bg-surface text-muted",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-center text-muted">Loading…</p>
      ) : medicines.length === 0 ? (
        <div className="mt-14 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand-soft">
            <Pill size={26} />
          </span>
          <p className="font-semibold">No medicines yet</p>
          <p className="mx-auto mt-1 max-w-[240px] text-sm text-muted">
            Add a medicine with its schedule and stock — Flowlet tells you when
            it's about to run out.
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <p className="mt-10 text-center text-muted">
          No medicines for this person yet.
        </p>
      ) : (
        <div className="space-y-5">
          {refillSoon.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-bad">
                <AlertTriangle size={15} />
                Refill soon
              </p>
              <div className="space-y-2">
                {refillSoon.map((m) => (
                  <MedCard
                    key={m.id}
                    med={m}
                    personName={nameFor(m)}
                    onTap={openEdit}
                  />
                ))}
              </div>
            </div>
          )}
          {healthy.length > 0 && (
            <div>
              {refillSoon.length > 0 && (
                <p className="mb-2 text-sm text-muted">Stocked up</p>
              )}
              <div className="space-y-2">
                {healthy.map((m) => (
                  <MedCard
                    key={m.id}
                    med={m}
                    personName={nameFor(m)}
                    onTap={openEdit}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <MedicineSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        medicine={editing}
      />
      {/* These follow the active person filter (Everyone / Mom / …). */}
      <OrderSheet
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        medicines={sorted}
      />
      <StockInSheet
        open={stockInOpen}
        onClose={() => setStockInOpen(false)}
        medicines={sorted}
      />
      <CostSheet
        open={costOpen}
        onClose={() => setCostOpen(false)}
        medicines={sorted}
      />
    </div>
  );
}
