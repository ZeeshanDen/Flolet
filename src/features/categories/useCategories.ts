import { useEffect, useState } from "react";
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
import type { Category } from "@/lib/types";

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "categories"),
      orderBy("order"),
    );
    return onSnapshot(q, (snap) => {
      setCategories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category),
      );
      setLoading(false);
    });
  }, [user]);

  const addCategory = async (
    cat: Omit<Category, "id" | "order">,
  ): Promise<string | undefined> => {
    if (!user) return;
    const order = categories.length;
    const ref = await addDoc(
      collection(db, "users", user.uid, "categories"),
      { ...cat, order },
    );
    return ref.id;
  };

  const updateCategory = async (
    id: string,
    patch: Partial<Omit<Category, "id">>,
  ): Promise<void> => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "categories", id), patch);
  };

  const deleteCategory = async (id: string): Promise<void> => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "categories", id));
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory };
}
