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
import { db } from "../../lib/firebase";
import { useAuth } from "../auth/AuthContext";
import { useVault, openEnc } from "../vault/vault";
import type { Expense, Category, UserProfile } from "../../lib/appTypes";

export function useExpenses() {
  const { user } = useAuth();
  const { status } = useVault();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "expenses"),
      orderBy("date", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const row = { id: d.id, ...d.data() } as Expense;
          if (row.enc) {
            const p = openEnc<{ name?: string }>(row.enc);
            row.name = p?.name ?? "•••";
          }
          return row;
        });
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
  }, [user, status]);

  const nameSuggestions = useMemo(() => {
    const names = new Set<string>();
    for (const e of expenses) if (e.name && e.name !== "•••") names.add(e.name);
    return [...names];
  }, [expenses]);

  // Native writes plaintext name; the web app's migration re-seals it.
  const addExpense = async (
    e: Omit<Expense, "id" | "createdAt" | "isShared" | "enc">,
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
    const out: Record<string, unknown> = { ...patch };
    if ("name" in patch) out.enc = deleteField();
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

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "categories"),
      orderBy("order"),
    );
    return onSnapshot(
      q,
      (snap) =>
        setCategories(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category),
        ),
      (err) => console.error("categories listener", err),
    );
  }, [user]);

  const addCategory = async (cat: Omit<Category, "id" | "order">) => {
    if (!user) return;
    const order =
      categories.reduce((m, c) => Math.max(m, c.order ?? 0), -1) + 1;
    await addDoc(collection(db, "users", user.uid, "categories"), {
      ...cat,
      order,
    });
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "categories", id), patch);
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "categories", id));
  };

  return { categories, addCategory, updateCategory, deleteCategory };
}

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

  const update = async (patch: Partial<UserProfile>) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), patch);
  };

  return { profile, currency: profile?.defaultCurrency ?? "INR", update };
}
