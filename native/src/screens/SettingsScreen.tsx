import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../features/auth/AuthContext";
import { useVault } from "../features/vault/vault";
import { C } from "../lib/theme";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { status } = useVault();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 20 }}>
      <Text style={{ color: C.text, fontSize: 24, fontWeight: "800", marginBottom: 20 }}>
        Settings
      </Text>

      <View
        style={{
          backgroundColor: C.card,
          borderColor: C.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <Text style={{ color: C.muted, fontSize: 12 }}>Signed in as</Text>
        <Text style={{ color: C.text, fontWeight: "700", marginTop: 2 }}>
          {user?.email}
        </Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>
          Vault: {status === "unlocked" ? "unlocked on this device" : status}
        </Text>
      </View>

      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 20 }}>
        Flowlet native (phase 1) covers medicines + reminders. Expenses,
        insights and splits live in the web app — same account, same data.
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
    </View>
  );
}
