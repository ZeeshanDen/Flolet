import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendEmailVerification,
  reload,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { seedDefaultCategories } from "@/features/categories/defaults";
import type { UserProfile } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** True when the signed-in user's email is verified (Google is always true). */
  verified: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  signInGoogle: () => Promise<void>;
  /** Re-send the verification email to the current user. */
  resendVerification: () => Promise<void>;
  /** Reload the user from Firebase and re-check emailVerified. */
  refreshVerification: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function ensureProfile(user: User) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Firestore rejects `undefined` field values — omit photoURL when absent.
    const profile: UserProfile = {
      displayName: user.displayName || user.email?.split("@")[0] || "User",
      email: user.email || "",
      createdAt: Date.now(),
      defaultCurrency: "INR",
      ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    };
    // merge:true — a second device racing here must not clobber later edits.
    await setDoc(ref, profile, { merge: true });
    await seedDefaultCategories(user.uid);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      // Render immediately; don't block the app on a Firestore round-trip.
      setUser(u);
      setVerified(!!u?.emailVerified);
      setLoading(false);
      // Only seed profile/categories once the email is verified, so unverified
      // sign-ups leave no data behind.
      if (u?.emailVerified)
        ensureProfile(u).catch((e) => console.error("ensureProfile", e));
    });
  }, []);

  const signInEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    // Gate access behind email verification instead of seeding immediately.
    await sendEmailVerification(cred.user);
    setVerified(false);
  };

  const signInGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const resendVerification = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  };

  // Stable identity — VerifyEmail polls this in an interval effect.
  const refreshVerification = useCallback(async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const v = auth.currentUser.emailVerified;
    setVerified(v);
    if (v) {
      setUser(auth.currentUser);
      ensureProfile(auth.currentUser).catch((e) =>
        console.error("ensureProfile", e),
      );
    }
    return v;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        verified,
        signInEmail,
        signUpEmail,
        signInGoogle,
        resendVerification,
        refreshVerification,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
