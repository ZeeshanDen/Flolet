import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../auth/AuthContext";
import { useVault, openEnc } from "../vault/vault";
import type { Medicine, MedPerson } from "../../lib/types";

export function useMedicines() {
  const { user } = useAuth();
  const { status } = useVault();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "medicines"),
      orderBy("createdAt"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const row = { id: d.id, ...d.data() } as Medicine;
          if (row.enc) {
            const p = openEnc<{ name?: string; notes?: string }>(row.enc);
            row.name = p?.name ?? "•••";
            row.notes = p?.notes;
          }
          return row;
        });
        setMedicines(rows);
        setLoading(false);
      },
      (err) => {
        console.error("medicines listener", err);
        setLoading(false);
      },
    );
    // status: re-decrypt after unlock
  }, [user, status]);

  // Writes keep the doc shape the web app expects. Native edits of name/notes
  // write PLAINTEXT name (the web app's migration re-seals it) — v1 tradeoff.
  const updateMedicine = async (id: string, patch: Partial<Medicine>) => {
    if (!user) return;
    const out: Record<string, unknown> = { ...patch };
    if ("name" in patch) out.enc = deleteField();
    await updateDoc(doc(db, "users", user.uid, "medicines", id), out);
  };

  const addMedicine = async (m: Omit<Medicine, "id" | "createdAt" | "enc">) => {
    if (!user) return;
    const clean = Object.fromEntries(
      Object.entries(m).filter(([, v]) => v !== undefined),
    );
    await addDoc(collection(db, "users", user.uid, "medicines"), {
      ...clean,
      createdAt: Date.now(),
    });
  };

  const deleteMedicine = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "medicines", id));
  };

  return { medicines, loading, addMedicine, updateMedicine, deleteMedicine };
}

export function usePersons() {
  const { user } = useAuth();
  const [persons, setPersons] = useState<MedPerson[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "medPersons"),
      orderBy("createdAt"),
    );
    return onSnapshot(
      q,
      (snap) =>
        setPersons(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MedPerson),
        ),
      (err) => console.error("persons listener", err),
    );
  }, [user]);

  return { persons };
}
