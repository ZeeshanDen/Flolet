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
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/AuthContext";
import { useVault } from "@/features/vault/vaultStore";
import { encryptJson, decryptJson } from "@/lib/crypto";
import type { Medicine } from "@/lib/types";

interface MedPrivate {
  name?: string;
  notes?: string;
}

export function useMedicines() {
  const { user } = useAuth();
  const { key } = useVault();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let current = true;
    const q = query(
      collection(db, "users", user.uid, "medicines"),
      orderBy("createdAt"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        void (async () => {
          const rows = await Promise.all(
            snap.docs.map(async (d) => {
              const row = { id: d.id, ...d.data() } as Medicine;
              // Health data is sensitive — sealed like expense notes.
              if (row.enc) {
                if (key) {
                  try {
                    const p = await decryptJson<MedPrivate>(key, row.enc);
                    row.name = p.name ?? "";
                    row.notes = p.notes;
                  } catch {
                    row.name = "•••";
                  }
                } else {
                  row.name = "•••";
                }
              }
              return row;
            }),
          );
          if (!current) return;
          setMedicines(rows);
          setLoading(false);
        })();
      },
      (err) => {
        console.error("medicines listener", err);
        setLoading(false);
      },
    );
    return () => {
      current = false;
      unsub();
    };
  }, [user, key]);

  /** Seal name+notes into `enc` when the vault is unlocked. */
  const seal = async (name: string, notes?: string) => {
    if (!key) return { name, ...(notes ? { notes } : {}) };
    return { enc: await encryptJson(key, { name, notes }) };
  };

  const addMedicine = async (
    m: Omit<Medicine, "id" | "createdAt" | "enc">,
  ) => {
    if (!user) return;
    const { name, notes, ...rest } = m;
    await addDoc(collection(db, "users", user.uid, "medicines"), {
      ...rest,
      ...(await seal(name, notes)),
      createdAt: Date.now(),
    });
  };

  const updateMedicine = async (id: string, patch: Partial<Medicine>) => {
    if (!user) return;
    let out: Record<string, unknown> = { ...patch };
    if (("name" in patch || "notes" in patch) && key) {
      const { name, notes, ...rest } = out;
      out = {
        ...rest,
        enc: await encryptJson(key, {
          name: (name as string) ?? "",
          notes: notes as string | undefined,
        }),
        name: deleteField(),
        notes: deleteField(),
      };
    }
    await updateDoc(doc(db, "users", user.uid, "medicines", id), out);
  };

  const deleteMedicine = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "medicines", id));
  };

  return { medicines, loading, addMedicine, updateMedicine, deleteMedicine };
}
