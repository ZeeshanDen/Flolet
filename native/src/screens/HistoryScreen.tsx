import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO, isToday, isYesterday, addMonths } from "date-fns";
import {
  useExpenses,
  useCategories,
  useProfile,
} from "../features/expenses/useExpenses";
import { CategoryIcon } from "../lib/icons";
import { formatMoney } from "../lib/utils";
import { C } from "../lib/theme";
import type { Expense } from "../lib/appTypes";

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isNaN(d.getTime())) return "Unknown date";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM yyyy");
}

type Mode = "all" | "month";

export default function HistoryScreen() {
  const { expenses, loading, updateExpense, deleteExpense } = useExpenses();
  const { categories } = useCategories();
  const { currency } = useProfile();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCat, setEditCat] = useState<string | null>(null);

  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const prefix = format(monthCursor, "yyyy-MM");
    return expenses.filter((e) => {
      if (mode === "month" && !e.date.startsWith(prefix)) return false;
      if (!needle) return true;
      const cat = catById[e.categoryId];
      return (
        e.name?.toLowerCase().includes(needle) ||
        cat?.name.toLowerCase().includes(needle)
      );
    });
  }, [expenses, q, catById, mode, monthCursor]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      map.set(e.date, [...(map.get(e.date) ?? []), e]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const openEdit = (e: Expense) => {
    setEditing(e);
    setEditAmount(String(e.amount));
    setEditNote(e.name ?? "");
    setEditCat(e.categoryId);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const amt = parseFloat(editAmount) || 0;
    if (amt <= 0 || !editCat) return;
    try {
      await updateExpense(editing.id, {
        amount: amt,
        categoryId: editCat,
        name: editNote.trim(),
      });
      setEditing(null);
    } catch (e) {
      console.error("update expense", e);
      Alert.alert("Couldn't save changes.");
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert("Delete expense?", formatMoney(editing.amount, currency), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteExpense(editing.id);
          setEditing(null);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: "800", marginBottom: 12 }}>
          History
        </Text>

        <TextInput
          style={{
            backgroundColor: C.surface,
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: 14,
            color: C.text,
            padding: 12,
            fontSize: 15,
            marginBottom: 12,
          }}
          placeholder="Search notes or categories"
          placeholderTextColor={C.muted}
          value={q}
          onChangeText={setQ}
        />

        {/* Period filter */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: C.surface,
            borderRadius: 12,
            padding: 4,
            marginBottom: 12,
          }}
        >
          {(["all", "month"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={{
                flex: 1,
                padding: 9,
                borderRadius: 9,
                alignItems: "center",
                backgroundColor: mode === m ? C.brand : "transparent",
              }}
            >
              <Text style={{ color: mode === m ? "#fff" : C.muted, fontWeight: "600" }}>
                {m === "all" ? "All" : "Month"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === "month" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: C.surface,
              borderColor: C.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 6,
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => setMonthCursor((c) => addMonths(c, -1))}
              style={{ padding: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color={C.muted} />
            </TouchableOpacity>
            <Text style={{ color: C.text, fontWeight: "700" }}>
              {format(monthCursor, "MMMM yyyy")}
            </Text>
            <TouchableOpacity
              onPress={() => setMonthCursor((c) => addMonths(c, 1))}
              style={{ padding: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </TouchableOpacity>
          </View>
        )}

        {mode === "month" && filtered.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              backgroundColor: C.brand + "1a",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: C.muted }}>
              {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
            </Text>
            <Text style={{ color: C.brandSoft, fontWeight: "700" }}>
              {formatMoney(total, currency)}
            </Text>
          </View>
        )}

        {loading ? (
          <Text style={{ color: C.muted, textAlign: "center", marginTop: 40 }}>
            Loading…
          </Text>
        ) : groups.length === 0 ? (
          <Text style={{ color: C.muted, textAlign: "center", marginTop: 40 }}>
            No expenses {mode === "month" ? "this month" : "yet"}.
          </Text>
        ) : (
          groups.map(([date, items]) => (
            <View key={date} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>{dayLabel(date)}</Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>
                  {formatMoney(items.reduce((s, e) => s + e.amount, 0), currency)}
                </Text>
              </View>
              {items.map((e) => {
                const cat = catById[e.categoryId];
                return (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => openEdit(e)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: C.card,
                      borderRadius: 14,
                      padding: 11,
                      marginBottom: 7,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        backgroundColor: (cat?.color ?? "#94a3b8") + "33",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 11,
                      }}
                    >
                      <CategoryIcon
                        name={cat?.icon ?? "CircleDollarSign"}
                        size={17}
                        color={cat?.color ?? "#94a3b8"}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: C.text, fontWeight: "600" }} numberOfLines={1}>
                        {e.name || cat?.name}
                      </Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>{cat?.name}</Text>
                    </View>
                    <Text style={{ color: C.text, fontWeight: "700" }}>
                      {formatMoney(e.amount, currency)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit modal */}
      <Modal
        visible={!!editing}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditing(null)}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginVertical: 10,
            }}
          >
            <Text style={{ color: C.text, fontSize: 20, fontWeight: "800" }}>
              Edit expense
            </Text>
            <TouchableOpacity onPress={() => setEditing(null)}>
              <Text style={{ color: C.muted, fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={{
              backgroundColor: C.surface,
              borderColor: C.border,
              borderWidth: 1,
              borderRadius: 12,
              color: C.text,
              padding: 12,
              fontSize: 22,
              fontWeight: "700",
              marginBottom: 12,
            }}
            keyboardType="decimal-pad"
            value={editAmount}
            onChangeText={setEditAmount}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {categories.map((c) => {
              const active = c.id === editCat;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setEditCat(c.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? c.color + "33" : C.surface,
                    borderColor: active ? c.color : C.border,
                    borderWidth: 1,
                  }}
                >
                  <CategoryIcon name={c.icon} size={14} color={c.color} />
                  <Text style={{ color: active ? C.text : C.muted, fontSize: 13, fontWeight: "600" }}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={{
              backgroundColor: C.surface,
              borderColor: C.border,
              borderWidth: 1,
              borderRadius: 12,
              color: C.text,
              padding: 12,
              fontSize: 15,
              marginBottom: 16,
            }}
            placeholder="Note"
            placeholderTextColor={C.muted}
            value={editNote}
            onChangeText={setEditNote}
          />
          <TouchableOpacity
            onPress={saveEdit}
            style={{
              backgroundColor: C.brand,
              borderRadius: 14,
              padding: 15,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              Save changes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete} style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={{ color: C.bad, fontWeight: "600" }}>Delete expense</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}
