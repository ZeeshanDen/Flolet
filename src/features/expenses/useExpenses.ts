import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/AuthContext";
import type { Expense } from "@/lib/types";

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Single-field order avoids a composite index; tie-break by createdAt client-side.
    const q = query(
      collection(db, "users", user.uid, "expenses"),
      orderBy("date", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Expense,
        );
        rows.sort((a, b) =>
          a.date === b.date
            ? b.createdAt - a.createdAt
            : a.date < b.date
              ? 1
              : -1,
        );
        setExpenses(rows);
        setLoading(false);
      },
      (err) => {
        console.error("expenses listener", err);
        setLoading(false);
      },
    );
  }, [user]);

  // Distinct prior names for the entry typeahead.
  const nameSuggestions = useMemo(() => {
    const names = new Set<string>();
    for (const e of expenses) if (e.name) names.add(e.name);
    return [...names];
  }, [expenses]);

  const addExpense = async (
    e: Omit<Expense, "id" | "createdAt" | "isShared">,
  ) => {
    if (!user) return;
    await addDoc(collection(db, "users", user.uid, "expenses"), {
      ...e,
      isShared: false,
      createdAt: Date.now(),
    });
  };

  const updateExpense = async (id: string, patch: Partial<Expense>) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "expenses", id), patch);
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
