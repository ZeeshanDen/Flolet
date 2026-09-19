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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { useExpenses, useCategories, useProfile } from "../features/expenses/useExpenses";
import { CategoryIcon } from "../lib/icons";
import { currencySymbol } from "../lib/utils";
import { C } from "../lib/theme";

const todayIso = () => format(new Date(), "yyyy-MM-dd");
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

function pushKey(current: string, key: string): string {
  if (key === "del") return current.slice(0, -1);
  if (key === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : current + ".";
  }
  if (current.includes(".")) {
    const [, dec] = current.split(".");
    if (dec.length >= 2) return current;
  } else if (current.length >= 9) return current;
  if (current === "0") return key;
  return current + key;
}

export default function EntryScreen() {
  const { addExpense } = useExpenses();
  const { categories } = useCategories();
  const { currency } = useProfile();

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIso());
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const numeric = parseFloat(amount) || 0;
  const canSave = numeric > 0 && !!categoryId;

  const key = (k: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAmount((a) => pushKey(a, k));
  };

  const save = async () => {
    if (!canSave || saving || !categoryId) return;
    setSaving(true);
    const cat = categories.find((c) => c.id === categoryId);
    try {
      await addExpense({
        amount: numeric,
        categoryId,
        name: note.trim() || cat?.name || "",
        date,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
      setAmount("");
      setCategoryId(null);
      setNote("");
      setDate(todayIso());
    } catch (e) {
      console.error("save expense", e);
      Alert.alert("Couldn't save", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = useMemo(
    () => (date === todayIso() ? "Today" : format(new Date(date), "d MMM")),
    [date],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>
            New expense
          </Text>
          <TouchableOpacity
            onPress={() => setDateOpen(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: C.surface,
              borderColor: C.border,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Ionicons name="calendar-outline" size={14} color={C.muted} />
            <Text style={{ color: C.muted, fontSize: 13 }}>{dateLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Amount card — tap to raise keypad */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => setKeypadOpen(true)}>
          <LinearGradient
            colors={["#2a2545", C.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                {amount ? "Amount" : "Tap to enter amount"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 3 }}>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 22, fontWeight: "700" }}>
                  {currencySymbol(currency)}
                </Text>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: amount.length > 8 ? 26 : 38,
                    fontWeight: "800",
                    marginLeft: 4,
                  }}
                  numberOfLines={1}
                >
                  {amount || "0"}
                </Text>
              </View>
            </View>
            <Ionicons name="keypad" size={22} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Category grid */}
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600", marginTop: 18, marginBottom: 10 }}>
          Category
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
          {categories.map((c) => {
            const active = c.id === categoryId;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={{
                  width: "22.5%",
                  alignItems: "center",
                  paddingVertical: 11,
                  borderRadius: 16,
                  backgroundColor: active ? c.color + "22" : C.surface,
                  borderColor: active ? c.color : C.border,
                  borderWidth: active ? 1.5 : 1,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    backgroundColor: c.color + (active ? "33" : "1f"),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CategoryIcon name={c.icon} size={18} color={c.color} />
                </View>
                <Text
                  style={{
                    color: active ? C.text : C.muted,
                    fontSize: 11,
                    fontWeight: "600",
                    marginTop: 5,
                  }}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Note */}
        <TextInput
          style={{
            backgroundColor: C.surface,
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: 14,
            color: C.text,
            padding: 13,
            fontSize: 15,
            marginTop: 16,
          }}
          placeholder="Add a note (optional)"
          placeholderTextColor={C.muted}
          value={note}
          onChangeText={setNote}
        />

        {/* Save */}
        <TouchableOpacity
          onPress={save}
          disabled={!canSave || saving}
          style={{
            marginTop: 18,
            backgroundColor: saved ? C.good : canSave ? C.brand : C.border,
            borderRadius: 16,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: canSave || saved ? "#fff" : C.muted,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {saved ? "✓ Saved" : "Save"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Keypad sheet */}
      <Modal
        visible={keypadOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setKeypadOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
          activeOpacity={1}
          onPress={() => setKeypadOpen(false)}
        />
        <View
          style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            padding: 16,
            paddingBottom: 34,
          }}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: C.border,
              alignSelf: "center",
              marginBottom: 10,
            }}
          />
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginBottom: 14 }}>
            <Text style={{ color: C.muted, fontSize: 22, fontWeight: "700" }}>
              {currencySymbol(currency)}
            </Text>
            <Text style={{ color: C.text, fontSize: 40, fontWeight: "800", marginLeft: 4 }}>
              {amount || "0"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
            {KEYS.map((k) => (
              <TouchableOpacity
                key={k}
                onPress={() => key(k)}
                style={{
                  width: "31.5%",
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: k === "del" ? "transparent" : C.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {k === "del" ? (
                  <Ionicons name="backspace-outline" size={24} color={C.muted} />
                ) : (
                  <Text style={{ color: C.text, fontSize: 24, fontWeight: "600" }}>
                    {k}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => setKeypadOpen(false)}
            style={{
              marginTop: 12,
              backgroundColor: numeric > 0 ? C.brand : C.border,
              borderRadius: 16,
              padding: 15,
              alignItems: "center",
            }}
          >
            <Text style={{ color: numeric > 0 ? "#fff" : C.muted, fontWeight: "700", fontSize: 16 }}>
              {numeric > 0 ? "Done" : "Enter amount"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Date picker */}
      {dateOpen && (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display="inline"
          themeVariant="dark"
          onChange={(_, d) => {
            setDateOpen(false);
            if (d) setDate(format(d, "yyyy-MM-dd"));
          }}
        />
      )}
    </SafeAreaView>
  );
}
