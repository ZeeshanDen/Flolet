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
  sendEmailVerification,
  reload,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { clearVault } from "../vault/vault";

interface AuthState {
  user: User | null;
  loading: boolean;
  verified: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
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
      }),
    [],
  );

  const signInEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const resendVerification = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  };

  const refreshVerification = async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const v = auth.currentUser.emailVerified;
    setVerified(v);
    if (v) setUser(auth.currentUser);
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
