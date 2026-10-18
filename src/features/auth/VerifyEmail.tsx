import { useEffect, useState } from "react";
import { MailCheck, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

export default function VerifyEmail() {
  const { user, resendVerification, refreshVerification, logout } = useAuth();
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-poll: many users verify in another tab, then return here.
  useEffect(() => {
    const id = setInterval(() => {
      refreshVerification().catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [refreshVerification]);

  const resend = async () => {
    try {
      await resendVerification();
      setSent(true);
      setCooldown(30);
    } catch {
      /* rate-limited — ignore */
    }
  };

  const check = async () => {
    setChecking(true);
    setNotYet(false);
    try {
      const ok = await refreshVerification();
      if (!ok) setNotYet(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="safe-top mx-auto flex h-full max-w-md flex-col justify-center px-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand">
          <MailCheck size={32} className="text-on-brand" />
        </div>
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-muted">
          We sent a verification link to
          <br />
          <span className="font-semibold text-text">{user?.email}</span>
        </p>
        <p className="mt-2 text-sm text-muted">
          Open it, then come back — access unlocks once verified.
        </p>
      </div>

      <button
        onClick={check}
        disabled={checking}
        className="btn-brand mb-3 w-full"
      >
        <RefreshCw size={18} className={checking ? "animate-spin" : ""} />
        {checking ? "Checking…" : "I've verified"}
      </button>

      {notYet && (
        <p className="mb-3 text-center text-sm text-bad">
          Not verified yet. Click the link in the email, then try again.
        </p>
      )}

      <button
        onClick={resend}
        disabled={cooldown > 0}
        className="btn-ghost mb-6 w-full disabled:opacity-50"
      >
        {cooldown > 0
          ? `Resend in ${cooldown}s`
          : sent
            ? "Resend email"
            : "Didn't get it? Resend"}
      </button>

      <button
        onClick={logout}
        className="mx-auto flex items-center gap-2 text-sm text-muted"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
}
