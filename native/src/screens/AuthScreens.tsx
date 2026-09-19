import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../features/auth/AuthContext";
import { unlockVault } from "../features/vault/vault";
import { C } from "../lib/theme";

const s = {
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center" as const,
    padding: 24,
  },
  logo: {
    alignSelf: "center" as const,
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.brand,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 14,
  },
  h1: {
    color: C.text,
    fontSize: 24,
    fontWeight: "700" as const,
    textAlign: "center" as const,
  },
  sub: {
    color: C.muted,
    textAlign: "center" as const,
    marginTop: 6,
    marginBottom: 24,
  },
  input: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    color: C.text,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: C.brand,
    borderRadius: 14,
    padding: 15,
    alignItems: "center" as const,
  },
  btnText: { color: "#fff", fontWeight: "700" as const, fontSize: 16 },
  link: { color: C.brandSoft, textAlign: "center" as const, marginTop: 16 },
  err: { color: C.bad, marginBottom: 10 },
};

export function SignInScreen() {
  const { signInEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInEmail(email.trim(), password);
    } catch {
      setError("Wrong email or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.logo}>
        <Text style={{ fontSize: 30 }}>💜</Text>
      </View>
      <Text style={s.h1}>Flowlet</Text>
      <Text style={s.sub}>Sign in with your Flowlet account</Text>
      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor={C.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        placeholder="Password"
        placeholderTextColor={C.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={s.err}>{error}</Text>}
      <TouchableOpacity style={s.btn} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnText}>Sign in</Text>
        )}
      </TouchableOpacity>
      <Text style={{ color: C.muted, marginTop: 18, textAlign: "center", fontSize: 13 }}>
        Google sign-in account? Set a password first: web app → sign out →
        "Forgot password" flow, or keep using the web version.
      </Text>
    </KeyboardAvoidingView>
  );
}

export function VerifyScreen() {
  const { user, resendVerification, refreshVerification, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  return (
    <View style={s.screen}>
      <Text style={s.h1}>Verify your email</Text>
      <Text style={s.sub}>
        We sent a link to {user?.email}. Open it, then tap below.
      </Text>
      <TouchableOpacity
        style={s.btn}
        onPress={async () => {
          setBusy(true);
          await refreshVerification();
          setBusy(false);
        }}
        disabled={busy}
      >
        <Text style={s.btnText}>I've verified</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={resendVerification}>
        <Text style={s.link}>Resend email</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logout}>
        <Text style={[s.link, { color: C.muted }]}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

export function UnlockScreen() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<"pass" | "recovery">("pass");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user || !value || busy) return;
    setBusy(true);
    setError(null);
    // Pure-JS PBKDF2 (600k) takes a few seconds — expected.
    setTimeout(async () => {
      const ok = await unlockVault(user.uid, value, mode);
      if (!ok)
        setError(
          mode === "pass" ? "Wrong passphrase." : "Recovery code doesn't match.",
        );
      setBusy(false);
    }, 50);
  };

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={s.h1}>Unlock your data</Text>
      <Text style={s.sub}>
        {mode === "pass"
          ? "Enter your encryption passphrase (one-time on this device)."
          : "Paste your recovery code."}
      </Text>
      <TextInput
        style={s.input}
        placeholder={mode === "pass" ? "Passphrase" : "XXXX-XXXX-…"}
        placeholderTextColor={C.muted}
        secureTextEntry={mode === "pass"}
        autoCapitalize="none"
        value={value}
        onChangeText={setValue}
      />
      {error && <Text style={s.err}>{error}</Text>}
      <TouchableOpacity style={s.btn} onPress={submit} disabled={busy || !value}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnText}>Unlock</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          setMode((m) => (m === "pass" ? "recovery" : "pass"));
          setValue("");
          setError(null);
        }}
      >
        <Text style={s.link}>
          {mode === "pass" ? "Use recovery code" : "Use passphrase"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logout}>
        <Text style={[s.link, { color: C.muted }]}>Sign out</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
