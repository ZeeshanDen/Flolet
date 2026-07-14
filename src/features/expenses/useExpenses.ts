import { useEffect, useMemo, useState } from "react";
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
import type { Expense } from "@/lib/types";

export function useExpenses() {
  const { user } = useAuth();
  const { key } = useVault();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let current = true; // drop late async decrypts after unmount/re-run
    // Single-field order avoids a composite index; tie-break by createdAt client-side.
    const q = query(
      collection(db, "users", user.uid, "expenses"),
      orderBy("date", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        void (async () => {
          const rows = await Promise.all(
            snap.docs.map(async (d) => {
              const row = { id: d.id, ...d.data() } as Expense;
              // E2E: decrypt the note when we hold the key; plaintext docs
              // (pre-vault) pass through untouched.
              if (row.enc) {
                if (key) {
                  try {
                    const payload = await decryptJson<{ name?: string }>(
                      key,
                      row.enc,
                    );
                    row.name = payload.name ?? "";
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
          rows.sort((a, b) =>
            a.date === b.date
              ? b.createdAt - a.createdAt
              : a.date < b.date
                ? 1
                : -1,
          );
          setExpenses(rows);
          setLoading(false);
        })();
      },
      (err) => {
        console.error("expenses listener", err);
        setLoading(false);
      },
    );
    return () => {
      current = false;
      unsub();
    };
  }, [user, key]);

  // Distinct prior names for the entry typeahead.
  const nameSuggestions = useMemo(() => {
    const names = new Set<string>();
    for (const e of expenses) if (e.name && e.name !== "•••") names.add(e.name);
    return [...names];
  }, [expenses]);

  /** Encrypt the note into `enc` when the vault is unlocked. */
  const sealName = async (name: string | undefined) => {
    if (!key) return { name: name ?? "" };
    return { enc: await encryptJson(key, { name: name ?? "" }) };
  };

  const addExpense = async (
    e: Omit<Expense, "id" | "createdAt" | "isShared">,
  ) => {
    if (!user) return;
    const { name, ...rest } = e;
    await addDoc(collection(db, "users", user.uid, "expenses"), {
      ...rest,
      ...(await sealName(name)),
      isShared: false,
      createdAt: Date.now(),
    });
  };

  const updateExpense = async (id: string, patch: Partial<Expense>) => {
    if (!user) return;
    let out: Record<string, unknown> = { ...patch };
    if ("name" in patch && key) {
      // Re-encrypt the edited note and drop any plaintext left on the doc.
      const { name, ...rest } = out;
      out = {
        ...rest,
        enc: await encryptJson(key, { name: (name as string) ?? "" }),
        name: deleteField(),
      };
    }
    await updateDoc(doc(db, "users", user.uid, "expenses", id), out);
  };

  const deleteExpense = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "expenses", id));
  };

  return {
    expenses,
    loading,
    nameSuggestions,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
