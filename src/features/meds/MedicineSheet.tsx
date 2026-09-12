import { useEffect, useState } from "react";
import { X, Trash2, Check, Plus } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { useMedicines } from "@/features/meds/useMedicines";
import { usePersons } from "@/features/meds/usePersons";
import { remainingUnits, todayIso, WEEKDAYS } from "@/features/meds/medsCalc";
import { cn } from "@/lib/utils";
import type { Medicine, MedSlot } from "@/lib/types";

const UNITS = ["tablet", "ml", "injection", "sachet", "drop"];
const SLOTS: { key: MedSlot; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "night", label: "Night" },
];
const REFILL_PRESETS = [10, 15, 30];

/**
 * Add/edit a medicine. Edit mode adds refill quick-actions and delete.
 * Pass `medicine` to edit; omit to create.
 */
export default function MedicineSheet({
  open,
  onClose,
  medicine,
}: {
  open: boolean;
  onClose: () => void;
  medicine?: Medicine | null;
}) {
  const { addMedicine, updateMedicine, deleteMedicine } = useMedicines();
  const { persons, addPerson } = usePersons();
  const editing = !!medicine;

  const [personId, setPersonId] = useState<string | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState(UNITS[0]);
  const [schedType, setSchedType] = useState<"daily" | "weekly">("daily");
  const [slots, setSlots] = useState<MedSlot[]>(["morning"]);
  const [weekday, setWeekday] = useState(1);
  const [unitsPerDose, setUnitsPerDose] = useState("1");
  const [stock, setStock] = useState("");
  const [packUnits, setPackUnits] = useState("");
  const [packMrp, setPackMrp] = useState("");
  const [packPrice, setPackPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [refill, setRefill] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    setRefill("");
    setAddingPerson(false);
    setNewPersonName("");
    if (medicine) {
      setPersonId(medicine.personId ?? null);
      setName(medicine.name);
      setUnit(medicine.unit);
      setUnitsPerDose(String(medicine.unitsPerDose));
      setNotes(medicine.notes ?? "");
      setStock(String(remainingUnits(medicine)));
      setPackUnits(medicine.packUnits ? String(medicine.packUnits) : "");
      setPackMrp(medicine.packMrp ? String(medicine.packMrp) : "");
      setPackPrice(medicine.packPrice ? String(medicine.packPrice) : "");
      if (medicine.schedule.type === "daily") {
        setSchedType("daily");
        setSlots(medicine.schedule.slots);
      } else {
        setSchedType("weekly");
        setWeekday(medicine.schedule.weekday);
      }
    } else {
      setPersonId(persons[0]?.id ?? null);
      setName("");
      setUnit(UNITS[0]);
      setSchedType("daily");
      setSlots(["morning"]);
      setWeekday(1);
      setUnitsPerDose("1");
      setStock("");
      setPackUnits("");
      setPackMrp("");
      setPackPrice("");
      setNotes("");
    }
  }, [open, medicine]);

  const toggleSlot = (s: MedSlot) =>
    setSlots((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const numStock = parseFloat(stock) || 0;
  const numPerDose = parseFloat(unitsPerDose) || 0;
  const canSave =
    name.trim().length > 0 &&
    numStock > 0 &&
    numPerDose > 0 &&
    (schedType === "weekly" || slots.length > 0);

  const save = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    setError(null);
    const schedule =
      schedType === "daily"
        ? ({ type: "daily", slots } as const)
        : ({ type: "weekly", weekday } as const);
    const payload = {
      name: name.trim(),
      unit,
      unitsPerDose: numPerDose,
      schedule,
      stock: numStock,
      stockAsOf: todayIso(),
      ...(personId ? { personId } : {}),
      // Pricing is optional; Firestore rejects undefined, so only include set values.
      ...(parseFloat(packUnits) > 0 ? { packUnits: parseFloat(packUnits) } : {}),
      ...(parseFloat(packMrp) > 0 ? { packMrp: parseFloat(packMrp) } : {}),
      ...(parseFloat(packPrice) > 0 ? { packPrice: parseFloat(packPrice) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      if (editing && medicine) await updateMedicine(medicine.id, payload);
      else await addMedicine(payload);
      onClose();
    } catch (e) {
      console.error("save medicine", e);
      setError("Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  };

  const doRefill = async (amount: number) => {
    if (!medicine || amount <= 0 || busy) return;
    setBusy(true);
    try {
      await updateMedicine(medicine.id, {
        stock: remainingUnits(medicine) + amount,
        stockAsOf: todayIso(),
      });
      onClose();
    } catch (e) {
      console.error("refill", e);
      setError("Couldn't refill — try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!medicine || busy) return;
    setBusy(true);
    try {
      await deleteMedicine(medicine.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">
          {editing ? "Edit medicine" : "New medicine"}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted"
        >
          <X size={18} />
        </button>
      </div>

      {editing && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-3.5">
          <div className="mb-2 text-xs font-semibold text-muted">
            Quick refill (adds to what's left)
          </div>
          <div className="flex gap-2">
            {REFILL_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => doRefill(n)}
                className="flex-1 rounded-xl bg-brand/10 py-2.5 text-sm font-bold text-brand-soft"
              >
                +{n}
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              placeholder="Other"
              className="w-20 rounded-xl border border-border bg-surface px-2 text-center text-sm outline-none"
              value={refill}
              onChange={(e) => setRefill(e.target.value)}
            />
            <button
              onClick={() => doRefill(parseFloat(refill) || 0)}
              disabled={!(parseFloat(refill) > 0)}
              aria-label="Refill custom amount"
              className="rounded-xl bg-brand px-3 text-white disabled:bg-border disabled:text-muted"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Who takes it */}
      <div className="mb-2 text-xs font-semibold text-muted">For</div>
      {addingPerson ? (
        <div className="mb-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Name (e.g. Mom)"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            autoFocus
          />
          <button
            onClick={async () => {
              const id = await addPerson(newPersonName);
              if (id) setPersonId(id);
              setAddingPerson(false);
              setNewPersonName("");
            }}
            disabled={!newPersonName.trim()}
            className="btn-brand shrink-0 px-4 disabled:bg-border disabled:text-muted"
          >
            Add
          </button>
        </div>
      ) : (
        <div className="noscroll mb-3 flex gap-2 overflow-x-auto pb-1">
          {persons.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersonId(p.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                personId === p.id
                  ? "bg-brand text-white"
                  : "border border-border bg-surface text-muted",
              )}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => setAddingPerson(true)}
            className="shrink-0 rounded-full border-[1.5px] border-dashed border-brand-soft px-4 py-2 text-sm font-semibold text-brand-soft"
          >
            + Person
          </button>
        </div>
      )}

      <input
        className="input mb-3"
        placeholder="Medicine name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus={!editing}
      />

      <div className="mb-3 flex gap-2">
        <select
          className="input flex-1"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label="Unit"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <input
          className="input w-28"
          type="number"
          inputMode="decimal"
          min="0.5"
          step="0.5"
          value={unitsPerDose}
          onChange={(e) => setUnitsPerDose(e.target.value)}
          aria-label="Units per dose"
          placeholder="Per dose"
        />
      </div>
      <p className="mb-3 -mt-1.5 text-xs text-muted">
        Units taken per intake — e.g. 1 tablet, or 0.5 for half.
      </p>

      {/* Schedule */}
      <div className="mb-2 text-xs font-semibold text-muted">Schedule</div>
      <div className="mb-3 flex gap-2 rounded-xl bg-surface p-1">
        {(["daily", "weekly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSchedType(t)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium capitalize transition",
              schedType === t ? "bg-brand text-white" : "text-muted",
            )}
          >
            {t === "daily" ? "Every day" : "Weekly"}
          </button>
        ))}
      </div>

      {schedType === "daily" ? (
        <div className="mb-4 grid grid-cols-4 gap-2">
          {SLOTS.map((s) => {
            const active = slots.includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleSlot(s.key)}
                className={cn(
                  "rounded-xl border py-2.5 text-xs font-semibold transition",
                  active
                    ? "border-brand bg-brand/15 text-brand-soft"
                    : "border-border bg-surface text-muted",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="noscroll mb-4 flex gap-2 overflow-x-auto pb-1">
          {WEEKDAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => setWeekday(i)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                weekday === i
                  ? "bg-brand text-white"
                  : "border border-border bg-surface text-muted",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <input
        className="input mb-3"
        type="number"
        inputMode="decimal"
        placeholder={editing ? "Stock on hand now" : `Current stock (${unit}s)`}
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        aria-label="Current stock"
      />

      {/* Pricing (optional) — powers the monthly-cost view */}
      <div className="mb-2 text-xs font-semibold text-muted">
        Pricing per pack/strip (optional)
      </div>
      <div className="mb-3 flex gap-2">
        <input
          className="input flex-1"
          type="number"
          inputMode="decimal"
          placeholder="Units/pack"
          value={packUnits}
          onChange={(e) => setPackUnits(e.target.value)}
          aria-label="Units per pack"
        />
        <input
          className="input flex-1"
          type="number"
          inputMode="decimal"
          placeholder="MRP ₹"
          value={packMrp}
          onChange={(e) => setPackMrp(e.target.value)}
          aria-label="MRP per pack"
        />
        <input
          className="input flex-1"
          type="number"
          inputMode="decimal"
          placeholder="You pay ₹"
          value={packPrice}
          onChange={(e) => setPackPrice(e.target.value)}
          aria-label="Your price per pack"
        />
      </div>

      <input
        className="input mb-4"
        placeholder="Notes (optional — e.g. after food)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && <p className="mb-3 text-sm text-bad">{error}</p>}

      <div className="flex gap-3">
        {editing &&
          (confirmDelete ? (
            <button
              onClick={remove}
              disabled={busy}
              className="h-[52px] shrink-0 rounded-2xl bg-bad px-4 text-sm font-bold text-white"
            >
              Really delete?
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete medicine"
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-border text-bad"
            >
              <Trash2 size={20} />
            </button>
          ))}
        <button
          onClick={save}
          disabled={!canSave || busy}
          className="btn-brand flex-1 disabled:bg-border disabled:text-muted"
        >
          <Check size={20} />
          {editing ? "Save changes" : "Add medicine"}
        </button>
      </div>
    </BottomSheet>
  );
}
