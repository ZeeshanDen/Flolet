import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/AuthContext";
import type { UserProfile } from "@/lib/types";

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "users", user.uid),
      (s) => setProfile(s.exists() ? (s.data() as UserProfile) : null),
      (err) => console.error("profile listener", err),
    );
  }, [user]);

  const currency = profile?.defaultCurrency ?? "INR";

  const update = async (patch: Partial<UserProfile>) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), patch);
    // Keep the Firebase Auth displayName in sync so group snapshots match.
    if (patch.displayName && auth.currentUser) {
      await updateAuthProfile(auth.currentUser, {
        displayName: patch.displayName,
      });
    }
  };

  return { profile, currency, update };
}
