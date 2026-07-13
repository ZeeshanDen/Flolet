import { useEffect, useState } from "react";
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Group, GroupExpense, Settlement } from "@/lib/types";

/** Standalone writer used by the entry screen (outside a group route). */
export async function writeGroupExpense(
  groupId: string,
  e: Omit<GroupExpense, "id" | "createdAt">,
) {
  await addDoc(collection(db, "groups", groupId, "expenses"), {
    ...e,
    createdAt: Date.now(),
  });
}

export function useGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    setGroup(null); // reset when switching groups — no stale flash
    return onSnapshot(
      doc(db, "groups", groupId),
      (snap) => {
        setGroup(
          snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null,
        );
        setLoading(false);
      },
      (err) => {
        console.error("group listener", err);
        setGroup(null);
        setLoading(false);
      },
    );
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    setExpenses([]);
    const q = query(
      collection(db, "groups", groupId, "expenses"),
      orderBy("date", "desc"),
    );
    return onSnapshot(
      q,
      (snap) =>
        setExpenses(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GroupExpense),
        ),
      (err) => console.error("group expenses listener", err),
    );
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    setSettlements([]);
    const q = query(
      collection(db, "groups", groupId, "settlements"),
      orderBy("date", "desc"),
    );
    return onSnapshot(
      q,
      (snap) =>
        setSettlements(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Settlement),
        ),
      (err) => console.error("group settlements listener", err),
    );
  }, [groupId]);

  const addGroupExpense = async (
    e: Omit<GroupExpense, "id" | "createdAt">,
  ) => {
    if (!groupId) return;
    await addDoc(collection(db, "groups", groupId, "expenses"), {
      ...e,
      createdAt: Date.now(),
    });
  };

  const addSettlement = async (
    s: Omit<Settlement, "id" | "createdAt">,
  ) => {
    if (!groupId) return;
    await addDoc(collection(db, "groups", groupId, "settlements"), {
      ...s,
      createdAt: Date.now(),
    });
  };

  const deleteGroupExpense = async (id: string) => {
    if (!groupId) return;
    await deleteDoc(doc(db, "groups", groupId, "expenses", id));
  };

  return {
    group,
    expenses,
    settlements,
    loading,
    addGroupExpense,
    addSettlement,
    deleteGroupExpense,
  };
}
