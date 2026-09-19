import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { format, parseISO } from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMedicines, usePersons } from "../features/meds/useMedicines";
import {
  remainingUnits,
  runOutDate,
  daysLeft,
  scheduleLabel,
  todayIso,
  WEEKDAYS,
} from "../features/meds/medsCalc";
import {
  remindersEnabled,
  setRemindersEnabled,
  requestPermission,
  rescheduleAll,
} from "../features/meds/reminders";
import { C } from "../lib/theme";
import type { Medicine, MedSlot } from "../lib/types";

const SLOTS: { key: MedSlot; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "night", label: "Night" },
];
const UNITS = ["tablet", "ml", "injection", "sachet", "drop"];

function statusColor(days: number) {
  if (days <= 5) return C.bad;
  if (days <= 14) return C.amber;
  return C.good;
}

function MedCard({
  med,
  personName,
  onPress,
}: {
  med: Medicine;
  personName?: string;
  onPress: () => void;
}) {
  const remaining = remainingUnits(med);
  const days = daysLeft(med);
  const out = remaining <= 0;
  const color = statusColor(days);
  const pct = med.stock > 0 ? Math.min(1, remaining / med.stock) : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
            {med.name}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {personName ? `${personName} · ` : ""}
            {scheduleLabel(med)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View
            style={{
              backgroundColor: color + "26",
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color, fontWeight: "700", fontSize: 12 }}>
              {out ? "Out of stock" : days === 0 ? "Last day" : `${days}d left`}
            </Text>
          </View>
          <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            {out
              ? "refill now"
              : `${remaining} ${med.unit}s · till ${format(parseISO(runOutDate(med)), "d MMM")}`}
          </Text>
        </View>
      </View>
      <View
        style={{
          height: 5,
          backgroundColor: C.surface,
          borderRadius: 3,
          marginTop: 12,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 3,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

const inputStyle = {
  backgroundColor: C.surface,
  borderColor: C.border,
  borderWidth: 1,
  borderRadius: 12,
  color: C.text,
  padding: 12,
  fontSize: 16,
  marginBottom: 10,
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? C.brand : C.surface,
        borderColor: active ? C.brand : C.border,
        borderWidth: 1,
        marginRight: 8,
      }}
    >
      <Text style={{ color: active ? "#fff" : C.muted, fontWeight: "600", fontSize: 13 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MedicineForm({
  medicine,
  onClose,
}: {
  medicine: Medicine | null;
  onClose: () => void;
}) {
  const { addMedicine, updateMedicine, deleteMedicine } = useMedicines();
  const editing = !!medicine;
  const [name, setName] = useState(medicine?.name ?? "");
  const [unit, setUnit] = useState(medicine?.unit ?? UNITS[0]);
  const [schedType, setSchedType] = useState<"daily" | "weekly">(
    medicine?.schedule.type ?? "daily",
  );
  const [slots, setSlots] = useState<MedSlot[]>(
    medicine?.schedule.type === "daily" ? medicine.schedule.slots : ["morning"],
  );
  const [weekday, setWeekday] = useState(
    medicine?.schedule.type === "weekly" ? medicine.schedule.weekday : 1,
  );
  const [unitsPerDose, setUnitsPerDose] = useState(
    String(medicine?.unitsPerDose ?? 1),
  );
  const [stock, setStock] = useState(
    medicine ? String(remainingUnits(medicine)) : "",
  );
  const [busy, setBusy] = useState(false);

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
    const schedule =
      schedType === "daily"
        ? ({ type: "daily", slots } as const)
        : ({ type: "weekly", weekday } as const);
    try {
      const payload = {
        name: name.trim(),
        unit,
        unitsPerDose: numPerDose,
        schedule,
        stock: numStock,
        stockAsOf: todayIso(),
        ...(medicine?.personId ? { personId: medicine.personId } : {}),
      };
      if (editing && medicine) await updateMedicine(medicine.id, payload);
      else await addMedicine(payload);
      onClose();
    } catch (e) {
      console.error("save medicine", e);
      Alert.alert("Couldn't save", "Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert("Delete medicine?", medicine?.name ?? "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (medicine) await deleteMedicine(medicine.id);
          onClose();
        },
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: C.bg, flex: 1 }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          marginTop: 8,
        }}
      >
        <Text style={{ color: C.text, fontSize: 20, fontWeight: "800" }}>
          {editing ? "Edit medicine" : "New medicine"}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: C.muted, fontSize: 16 }}>Close</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={inputStyle}
        placeholder="Medicine name"
        placeholderTextColor={C.muted}
        value={name}
        onChangeText={setName}
      />

      <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
        Unit
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {UNITS.map((u) => (
          <Chip key={u} label={u} active={unit === u} onPress={() => setUnit(u)} />
        ))}
      </View>

      <TextInput
        style={inputStyle}
        placeholder="Units per dose (e.g. 1)"
        placeholderTextColor={C.muted}
        keyboardType="decimal-pad"
        value={unitsPerDose}
        onChangeText={setUnitsPerDose}
      />

      <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
        Schedule
      </Text>
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <Chip
          label="Every day"
          active={schedType === "daily"}
          onPress={() => setSchedType("daily")}
        />
        <Chip
          label="Weekly"
          active={schedType === "weekly"}
          onPress={() => setSchedType("weekly")}
        />
      </View>
      {schedType === "daily" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
          {SLOTS.map((sl) => (
            <Chip
              key={sl.key}
              label={sl.label}
              active={slots.includes(sl.key)}
              onPress={() =>
                setSlots((prev) =>
                  prev.includes(sl.key)
                    ? prev.filter((x) => x !== sl.key)
                    : [...prev, sl.key],
                )
              }
            />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
          {WEEKDAYS.map((d, i) => (
            <Chip key={d} label={d} active={weekday === i} onPress={() => setWeekday(i)} />
          ))}
        </View>
      )}

      <TextInput
        style={inputStyle}
        placeholder="Current stock"
        placeholderTextColor={C.muted}
        keyboardType="decimal-pad"
        value={stock}
        onChangeText={setStock}
      />

      <TouchableOpacity
        onPress={save}
        disabled={!canSave || busy}
        style={{
          backgroundColor: canSave ? C.brand : C.border,
          borderRadius: 14,
          padding: 15,
          alignItems: "center",
          marginTop: 8,
        }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: canSave ? "#fff" : C.muted, fontWeight: "700", fontSize: 16 }}>
            {editing ? "Save changes" : "Add medicine"}
          </Text>
        )}
      </TouchableOpacity>

      {editing && (
        <TouchableOpacity onPress={remove} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ color: C.bad, fontWeight: "600" }}>Delete medicine</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

export default function MedsScreen() {
  const { medicines, loading } = useMedicines();
  const { persons } = usePersons();
  const [filter, setFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [reminders, setReminders] = useState(false);
  const [scheduled, setScheduled] = useState<number | null>(null);

  useEffect(() => {
    remindersEnabled().then(setReminders);
  }, []);

  // Reschedule whenever data changes while reminders are on.
  useEffect(() => {
    if (!reminders || medicines.length === 0) return;
    rescheduleAll(medicines).then(setScheduled).catch(console.error);
  }, [reminders, medicines]);

  const toggleReminders = async (on: boolean) => {
    if (on) {
      const ok = await requestPermission();
      if (!ok) {
        Alert.alert(
          "Notifications disabled",
          "Enable notifications for Flowlet in iOS Settings first.",
        );
        return;
      }
    }
    setReminders(on);
    await setRemindersEnabled(on);
    if (on && medicines.length) setScheduled(await rescheduleAll(medicines));
  };

  const personById = useMemo(
    () => Object.fromEntries(persons.map((p) => [p.id, p.name])),
    [persons],
  );
  const sorted = useMemo(() => {
    const list = filter ? medicines.filter((m) => m.personId === filter) : medicines;
    return [...list].sort((a, b) => daysLeft(a) - daysLeft(b));
  }, [medicines, filter]);
  const refillSoon = sorted.filter((m) => daysLeft(m) <= 14);
  const healthy = sorted.filter((m) => daysLeft(m) > 14);
  const nameFor = (m: Medicine) =>
    !filter && m.personId ? personById[m.personId] : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: C.text, fontSize: 24, fontWeight: "800" }}>
            Medicines
          </Text>
          <TouchableOpacity
            onPress={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            style={{
              backgroundColor: C.brand,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders toggle — the native win */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: C.card,
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: "700" }}>Dose & refill reminders</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
              {reminders
                ? `On — ${scheduled ?? "…"} notification${scheduled === 1 ? "" : "s"} scheduled`
                : "Morning 8:00 · Afternoon 13:00 · Evening 18:00 · Night 21:00"}
            </Text>
          </View>
          <Switch
            value={reminders}
            onValueChange={toggleReminders}
            trackColor={{ true: C.brand, false: C.border }}
          />
        </View>

        {persons.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <Chip label="Everyone" active={filter === null} onPress={() => setFilter(null)} />
            {persons.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                active={filter === p.id}
                onPress={() => setFilter(p.id)}
              />
            ))}
          </ScrollView>
        )}

        {loading ? (
          <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />
        ) : sorted.length === 0 ? (
          <Text style={{ color: C.muted, textAlign: "center", marginTop: 40 }}>
            No medicines yet — add one with its schedule and stock.
          </Text>
        ) : (
          <>
            {refillSoon.length > 0 && (
              <Text style={{ color: C.bad, fontWeight: "700", marginBottom: 8 }}>
                ⚠ Refill soon
              </Text>
            )}
            {refillSoon.map((m) => (
              <MedCard
                key={m.id}
                med={m}
                personName={nameFor(m)}
                onPress={() => {
                  setEditing(m);
                  setFormOpen(true);
                }}
              />
            ))}
            {healthy.length > 0 && refillSoon.length > 0 && (
              <Text style={{ color: C.muted, marginBottom: 8, marginTop: 6 }}>
                Stocked up
              </Text>
            )}
            {healthy.map((m) => (
              <MedCard
                key={m.id}
                med={m}
                personName={nameFor(m)}
                onPress={() => {
                  setEditing(m);
                  setFormOpen(true);
                }}
              />
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={formOpen} animationType="slide" presentationStyle="pageSheet">
        <MedicineForm medicine={editing} onClose={() => setFormOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}
