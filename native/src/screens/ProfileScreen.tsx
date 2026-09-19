import { useEffect, useState } from "react";
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
import { useAuth } from "../features/auth/AuthContext";
import { useVault } from "../features/vault/vault";
import { useCategories, useProfile } from "../features/expenses/useExpenses";
import { CategoryIcon, PICKABLE_COLORS, PICKABLE_ICONS } from "../lib/icons";
import { CURRENCIES, currencySymbol } from "../lib/utils";
import { C } from "../lib/theme";

const card = {
  backgroundColor: C.card,
  borderColor: C.border,
  borderWidth: 1,
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
} as const;

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { status } = useVault();
  const { profile, currency, update } = useProfile();
  const { categories, addCategory, updateCategory, deleteCategory } =
    useCategories();

  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PICKABLE_COLORS[5]);
  const [newCatIcon, setNewCatIcon] = useState(PICKABLE_ICONS[0]);
  const [editingCat, setEditingCat] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setName(profile.displayName);
  }, [profile?.displayName]);

  const initial = (profile?.displayName || user?.email || "?")
    .charAt(0)
    .toUpperCase();

  const saveName = async () => {
    if (!name.trim()) return;
    await update({ displayName: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const submitCat = async () => {
    if (!newCatName.trim()) return;
    if (editingCat)
      await updateCategory(editingCat, {
        name: newCatName.trim(),
        color: newCatColor,
        icon: newCatIcon,
      });
    else
      await addCategory({
        name: newCatName.trim(),
        color: newCatColor,
        icon: newCatIcon,
      });
    setNewCatName("");
    setEditingCat(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: "800", marginBottom: 14 }}>
          Profile
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              backgroundColor: C.brand,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>{initial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontWeight: "700" }} numberOfLines={1}>
              {profile?.displayName}
            </Text>
            <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>

        <View style={card}>
          <Text style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>Display name</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: C.surface,
                borderColor: C.border,
                borderWidth: 1,
                borderRadius: 12,
                color: C.text,
                padding: 11,
                fontSize: 15,
              }}
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity
              onPress={saveName}
              style={{
                backgroundColor: C.brand,
                borderRadius: 12,
                paddingHorizontal: 16,
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {saved ? "✓" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: C.muted, fontSize: 13, marginTop: 14, marginBottom: 8 }}>
            Default currency
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CURRENCIES.map((c) => {
              const active = currency === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => update({ defaultCurrency: c })}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? C.brand : C.surface,
                    borderColor: active ? C.brand : C.border,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ color: active ? "#fff" : C.muted, fontWeight: "600", fontSize: 13 }}>
                    {currencySymbol(c)} {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={card} onPress={() => setCatsOpen(true)}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                backgroundColor: C.brand + "1a",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="pricetags" size={18} color={C.brandSoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: "700" }}>Manage categories</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>
                {categories.length} categories · add, edit or remove
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </View>
        </TouchableOpacity>

        <View style={card}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                backgroundColor: (status === "unlocked" ? C.good : C.brand) + "1a",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons
                name="shield-checkmark"
                size={18}
                color={status === "unlocked" ? C.good : C.brandSoft}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: "700" }}>
                End-to-end encryption
              </Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>
                {status === "unlocked"
                  ? "On — key in the iOS Keychain"
                  : status === "none"
                    ? "Off — enable from the web app"
                    : status}
              </Text>
            </View>
          </View>
        </View>

        <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
          Groups & splits live in the web app for now — same account, same data:
          flowlet-dev.web.app
        </Text>

        <TouchableOpacity
          onPress={logout}
          style={{
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: C.bad, fontWeight: "700" }}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Manage categories */}
      <Modal
        visible={catsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCatsOpen(false)}
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
              Manage categories
            </Text>
            <TouchableOpacity onPress={() => setCatsOpen(false)}>
              <Text style={{ color: C.muted, fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>

          {categories.map((c) => (
            <View
              key={c.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: C.card,
                borderRadius: 14,
                padding: 11,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  backgroundColor: c.color + "33",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <CategoryIcon name={c.icon} size={16} color={c.color} />
              </View>
              <Text style={{ color: C.text, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                {c.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingCat(c.id);
                  setNewCatName(c.name);
                  setNewCatColor(c.color);
                  setNewCatIcon(c.icon);
                }}
                style={{ padding: 8 }}
              >
                <Ionicons name="pencil" size={16} color={C.muted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert("Delete category?", c.name, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteCategory(c.id),
                    },
                  ])
                }
                style={{ padding: 8 }}
              >
                <Ionicons name="trash" size={16} color={C.bad} />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={{ color: C.text, fontWeight: "700", marginTop: 14, marginBottom: 8 }}>
            {editingCat ? "Edit category" : "New category"}
          </Text>
          <TextInput
            style={{
              backgroundColor: C.surface,
              borderColor: C.border,
              borderWidth: 1,
              borderRadius: 12,
              color: C.text,
              padding: 12,
              fontSize: 15,
              marginBottom: 10,
            }}
            placeholder="Category name"
            placeholderTextColor={C.muted}
            value={newCatName}
            onChangeText={setNewCatName}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {PICKABLE_COLORS.map((col) => (
              <TouchableOpacity
                key={col}
                onPress={() => setNewCatColor(col)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  backgroundColor: col,
                  borderWidth: col === newCatColor ? 3 : 0,
                  borderColor: "#fff",
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {PICKABLE_ICONS.slice(0, 12).map((ic) => (
              <TouchableOpacity
                key={ic}
                onPress={() => setNewCatIcon(ic)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: ic === newCatIcon ? newCatColor + "33" : C.surface,
                  borderColor: ic === newCatIcon ? newCatColor : C.border,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CategoryIcon
                  name={ic}
                  size={18}
                  color={ic === newCatIcon ? newCatColor : C.muted}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={submitCat}
            disabled={!newCatName.trim()}
            style={{
              backgroundColor: newCatName.trim() ? C.brand : C.border,
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: newCatName.trim() ? "#fff" : C.muted,
                fontWeight: "700",
              }}
            >
              {editingCat ? "Save changes" : "Create category"}
            </Text>
          </TouchableOpacity>
          {editingCat && (
            <TouchableOpacity
              onPress={() => {
                setEditingCat(null);
                setNewCatName("");
              }}
              style={{ marginTop: 12, alignItems: "center" }}
            >
              <Text style={{ color: C.muted }}>Cancel edit</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}
