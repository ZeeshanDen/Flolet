import { useMemo, useState } from "react";
import {
  Plus,
  Pill,
  AlertTriangle,
  ClipboardList,
  PackagePlus,
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
  if (days <= 5) return { text: "text-bad", bg: "bg-bad/12", bar: "#e5484d" };
  if (days <= 14) return { text: "text-warn", bg: "bg-warn/12", bar: "#d97706" };
  return { text: "text-good", bg: "bg-good/12", bar: "#16a34a" };
}

function MedRow({
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
      className="flex w-full items-center gap-3 py-3 text-left transition active:opacity-70"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{med.name}</p>
        <p className="truncate text-[12px] text-muted">
          {personName ? `${personName} · ` : ""}
          {out
            ? scheduleLabel(med)
            : `${remaining} ${med.unit}${remaining === 1 ? "" : "s"} · till ${format(parseISO(runOutDate(med)), "d MMM")}`}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(2, pct)}%`, background: c.bar }}
          />
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold",
          c.bg,
          c.text,
        )}
      >
        {out ? "Out" : days === 0 ? "Last day" : `${days} days`}
      </span>
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

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (m: Medicine) => {
    setEditing(m);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-3 px-4 pt-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[22px] font-bold tracking-tight">Medicines</h1>
        <button
          onClick={openAdd}
          aria-label="Add medicine"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-on-brand"
        >
          <Plus size={20} />
        </button>
      </div>

      {persons.length > 0 && (
        <div className="noscroll flex w-fit max-w-full overflow-x-auto rounded-full bg-raised p-1 text-[12px] font-semibold">
          {[{ id: null as string | null, name: "Everyone" }, ...persons].map(
            (p) => (
              <button
                key={p.id ?? "all"}
                onClick={() => setFilter(p.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 transition",
                  filter === p.id
                    ? "bg-card text-text shadow-card"
                    : "text-muted",
                )}
              >
                {p.name}
              </button>
            ),
          )}
        </div>
      )}

      {medicines.length > 0 && (
        <div className="noscroll -mx-4 flex gap-2 overflow-x-auto px-4">
          <button
            onClick={() => setOrderOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-semibold"
          >
            <ClipboardList size={15} />
            Order list
          </button>
          <button
            onClick={() => setStockInOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-semibold"
          >
            <PackagePlus size={15} />
            Stock in
          </button>
          <button
            onClick={() => setCostOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-semibold"
          >
            <IndianRupee size={15} />
            Monthly cost
          </button>
        </div>
      )}

      {loading ? (
        <p className="pt-8 text-center text-muted">Loading…</p>
      ) : medicines.length === 0 ? (
        <div className="card pb-6 pt-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-raised text-muted">
            <Pill size={22} />
          </span>
          <p className="font-semibold">No medicines yet</p>
          <p className="mx-auto mt-1 max-w-[250px] text-sm text-muted">
            Add a medicine with its schedule and stock. Flowlet tells you
            before it runs out.
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <p className="pt-8 text-center text-muted">
          No medicines for this person yet.
        </p>
      ) : (
        <>
          {refillSoon.length > 0 && (
            <div className="card px-4 pb-1 pt-3.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-bad">
                <AlertTriangle size={14} />
                Needs refill · {refillSoon.length}
              </p>
              <div className="divide-y divide-border">
                {refillSoon.map((m) => (
                  <MedRow
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
            <div className="card px-4 pb-1 pt-3.5">
              <p className="text-[12px] font-semibold text-muted">
                Stocked · {healthy.length}
              </p>
              <div className="divide-y divide-border">
                {healthy.map((m) => (
                  <MedRow
                    key={m.id}
                    med={m}
                    personName={nameFor(m)}
                    onTap={openEdit}
                  />
                ))}
              </div>
            </div>
          )}
        </>
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
