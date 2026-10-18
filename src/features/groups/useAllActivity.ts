import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Group, GroupExpense, Settlement } from "@/lib/types";

/**
 * Live expenses + settlements across ALL of the user's groups — the data
 * behind the Friends view. Personal scale: one listener pair per group.
 */
export function useAllActivity(groups: Group[]) {
  const [expenses, setExpenses] = useState<Record<string, GroupExpense[]>>({});
  const [settlements, setSettlements] = useState<Record<string, Settlement[]>>(
    {},
  );

  // Stable dependency: re-subscribe only when the set of groups changes.
  const ids = groups.map((g) => g.id).sort().join(",");

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    for (const id of ids ? ids.split(",") : []) {
      unsubs.push(
        onSnapshot(
          collection(db, "groups", id, "expenses"),
          (snap) =>
            setExpenses((m) => ({
              ...m,
              [id]: snap.docs.map(
                (d) => ({ id: d.id, ...d.data() }) as GroupExpense,
              ),
            })),
          (err) => console.error("activity expenses", id, err),
        ),
        onSnapshot(
          collection(db, "groups", id, "settlements"),
          (snap) =>
            setSettlements((m) => ({
              ...m,
              [id]: snap.docs.map(
                (d) => ({ id: d.id, ...d.data() }) as Settlement,
              ),
            })),
          (err) => console.error("activity settlements", id, err),
        ),
      );
    }
    return () => unsubs.forEach((u) => u());
  }, [ids]);

  return useMemo(() => ({ expenses, settlements }), [expenses, settlements]);
}
