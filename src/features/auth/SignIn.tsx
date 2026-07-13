import { useState } from "react";
import { Wallet, ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

export default function SignIn() {
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"in" | "up">(
    params.get("mode") === "up" ? "up" : "in",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Map Firebase error codes to friendly copy — raw messages leak
  // implementation detail and read like stack traces.
  const friendly = (err: unknown): string => {
    const code = (err as { code?: string })?.code ?? "";
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Wrong email or password.";
      case "auth/email-already-in-use":
        return "An account with this email already exists — sign in instead.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/invalid-email":
        return "That email address doesn't look right.";
      case "auth/too-many-requests":
        return "Too many attempts — wait a minute and try again.";
      case "auth/network-request-failed":
        return "Network error — check your connection.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "in") await signInEmail(email, password);
      else await signUpEmail(email, password, name);
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    try {
      await signInGoogle();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code !== "auth/popup-closed-by-user") setError(friendly(err));
    }
  };

  return (
    <div className="safe-top mx-auto flex h-full max-w-md flex-col justify-center px-6">
      <Link
        to="/"
        className="mb-6 flex items-center gap-1.5 text-sm text-muted"
      >
        <ArrowLeft size={16} />
        Back
      </Link>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand">
          <Wallet size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold">Flowlet</h1>
        <p className="text-muted">Track spending. Split with anyone.</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "up" && (
          <input
            className="input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          required
        />

        {error && <p className="text-sm text-bad">{error}</p>}

        <button className="btn-brand w-full" disabled={busy}>
          {mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button onClick={google} className="btn-ghost mt-3 w-full">
        Continue with Google
      </button>

      <button
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="mt-6 text-center text-sm text-muted"
      >
        {mode === "in"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
