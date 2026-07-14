import { useState } from "react";
import { Lock, LogOut, KeyRound } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useVault } from "@/features/vault/vaultStore";

/** Full-screen gate shown when the vault exists but this device has no key. */
export default function UnlockVault() {
  const { user, logout } = useAuth();
  const { unlock, unlockRecovery } = useVault();
  const [mode, setMode] = useState<"pass" | "recovery">("pass");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok =
        mode === "pass"
          ? await unlock(user.uid, value)
          : await unlockRecovery(user.uid, value);
      if (!ok)
        setError(
          mode === "pass"
            ? "Wrong passphrase. Try again."
            : "That recovery code doesn't match.",
        );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="safe-top mx-auto flex h-full max-w-md flex-col justify-center px-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand">
          <Lock size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold">Unlock your data</h1>
        <p className="mt-2 text-muted">
          {mode === "pass"
            ? "Enter your encryption passphrase to decrypt this device."
            : "Paste the recovery code you saved at setup."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          className="input"
          type={mode === "pass" ? "password" : "text"}
          placeholder={
            mode === "pass" ? "Encryption passphrase" : "XXXX-XXXX-XXXX-…"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button className="btn-brand w-full" disabled={!value || busy}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode((m) => (m === "pass" ? "recovery" : "pass"));
          setValue("");
          setError(null);
        }}
        className="mx-auto mt-5 flex items-center gap-2 text-sm text-brand-soft"
      >
        <KeyRound size={16} />
        {mode === "pass" ? "Use recovery code instead" : "Use passphrase instead"}
      </button>

      <button
        onClick={logout}
        className="mx-auto mt-6 flex items-center gap-2 text-sm text-muted"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
}
