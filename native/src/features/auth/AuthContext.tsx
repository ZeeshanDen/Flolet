import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  reload,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { clearVault } from "../vault/vault";

// Mirrors the web app's seeded defaults (same deterministic default-i ids).
const DEFAULT_CATEGORIES = [
  { name: "Food", icon: "UtensilsCrossed", color: "#f97316", order: 0 },
  { name: "Groceries", icon: "ShoppingCart", color: "#22c55e", order: 1 },
  { name: "Transport", icon: "Car", color: "#3b82f6", order: 2 },
  { name: "Shopping", icon: "ShoppingBag", color: "#ec4899", order: 3 },
  { name: "Bills", icon: "ReceiptText", color: "#eab308", order: 4 },
  { name: "Rent", icon: "Home", color: "#8b5cf6", order: 5 },
  { name: "Health", icon: "HeartPulse", color: "#ef4444", order: 6 },
  { name: "Fun", icon: "PartyPopper", color: "#06b6d4", order: 7 },
  { name: "Travel", icon: "Plane", color: "#14b8a6", order: 8 },
  { name: "Other", icon: "CircleDollarSign", color: "#94a3b8", order: 9 },
];

/**
 * Same as web: seed profile + categories only for a VERIFIED user.
 * Profile and categories are checked independently — a half-finished seed
 * (e.g. a permission failure mid-way) heals on the next run.
 */
async function ensureProfile(user: User) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        createdAt: Date.now(),
        defaultCurrency: "INR",
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
      },
      { merge: true },
    );
  }
  const marker = await getDoc(
    doc(db, "users", user.uid, "categories", "default-0"),
  );
  if (!marker.exists()) {
    const batch = writeBatch(db);
    DEFAULT_CATEGORIES.forEach((cat, i) =>
      batch.set(doc(db, "users", user.uid, "categories", `default-${i}`), cat),
    );
    await batch.commit();
  }
}

interface AuthState {
  user: User | null;
  loading: boolean;
  verified: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshVerification: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setVerified(!!u?.emailVerified);
        setLoading(false);
        if (u?.emailVerified) {
          // The cached ID token can predate verification (email_verified=false)
          // and Firestore rules would reject everything — refresh it once.
          u.getIdToken(true).catch(() => {});
          ensureProfile(u).catch((e) => console.error("ensureProfile", e));
        }
      }),
    [],
  );

  const signInEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user); // gate matches web + rules
    setVerified(false);
  };

  const resendVerification = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  };

  const refreshVerification = async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const v = auth.currentUser.emailVerified;
    if (v) {
      // The cached ID token still carries email_verified=false — rules would
      // reject every read until it refreshes. Force it before proceeding.
      await auth.currentUser.getIdToken(true);
      setUser(auth.currentUser);
      ensureProfile(auth.currentUser).catch((e) =>
        console.error("ensureProfile", e),
      );
    }
    setVerified(v);
    return v;
  };

  const logout = async () => {
    await clearVault(auth.currentUser?.uid);
    await signOut(auth);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        verified,
        signInEmail,
        signUpEmail,
        resendVerification,
        refreshVerification,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
