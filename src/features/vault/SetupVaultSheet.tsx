import { useState } from "react";
import { X, ShieldCheck, Copy, Check, AlertTriangle } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { useAuth } from "@/features/auth/AuthContext";
import { useVault } from "@/features/vault/vaultStore";
import { cn } from "@/lib/utils";

/**
 * Two-step vault setup: choose a passphrase, then save the recovery code.
 * The recovery code is shown exactly once — it IS the master key.
 */
export default function SetupVaultSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { setup } = useVault();
  const [step, setStep] = useState<"pass" | "code">("pass");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const valid = pass.length >= 8 && pass === confirm;

  const create = async () => {
    if (!user || !valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const recovery = await setup(user.uid, pass);
      setCode(recovery);
      setStep("code");
    } catch (e) {
      console.error("vault setup", e);
      setError("Couldn't set up encryption — try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — user can still transcribe it
    }
  };

  const finish = () => {
    setPass("");
    setConfirm("");
    setCode("");
    setSaved(false);
    setStep("pass");
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={step === "code" ? finish : onClose}>
      {step === "pass" ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">End-to-end encryption</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand/10 p-3.5 text-sm">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand-soft" />
            <p className="text-muted">
              Your expense notes get encrypted on this device with a key only
              you hold. Nobody — including us — can read them without your
              passphrase.
            </p>
          </div>

          <input
            className="input mb-3"
            type="password"
            placeholder="Encryption passphrase (min 8 characters)"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="new-password"
            autoFocus
          />
          <input
            className="input mb-3"
            type="password"
            placeholder="Repeat passphrase"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {confirm.length > 0 && pass !== confirm && (
            <p className="mb-3 text-sm text-bad">Passphrases don't match.</p>
          )}
          {error && <p className="mb-3 text-sm text-bad">{error}</p>}

          <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-card p-3.5 text-sm text-muted">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-bad" />
            <p>
              This is not your login password. If you lose the passphrase{" "}
              <span className="font-semibold text-text">and</span> the recovery
              code shown next, your encrypted notes are gone forever — by
              design.
            </p>
          </div>

          <button
            onClick={create}
            disabled={!valid || busy}
            className="btn-brand w-full disabled:bg-border disabled:text-muted"
          >
            {busy ? "Setting up…" : "Continue"}
          </button>
        </>
      ) : (
        <>
          <h2 className="mb-2 text-lg font-extrabold">Save your recovery code</h2>
          <p className="mb-4 text-sm text-muted">
            Shown once. It unlocks your data if you forget the passphrase.
            Store it in a password manager.
          </p>

          <div className="mb-3 select-all break-all rounded-2xl border border-border bg-card p-4 font-mono text-sm tracking-wide">
            {code}
          </div>

          <button onClick={copy} className="btn-ghost mb-4 w-full">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copied" : "Copy code"}
          </button>

          <label className="mb-4 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand))]"
            />
            <span>
              I've saved my recovery code somewhere safe. I understand it can't
              be shown again.
            </span>
          </label>

          <button
            onClick={finish}
            disabled={!saved}
            className={cn(
              "btn-brand w-full",
              !saved && "bg-border text-muted",
            )}
          >
            Done — encryption is on
          </button>
        </>
      )}
    </BottomSheet>
  );
}
