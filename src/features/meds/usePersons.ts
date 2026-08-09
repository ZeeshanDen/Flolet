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
import type { MedPerson } from "@/lib/types";

/** Family members medicines belong to. Local profiles — no accounts. */
export function usePersons() {
  const { user } = useAuth();
  const [persons, setPersons] = useState<MedPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "medPersons"),
      orderBy("createdAt"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setPersons(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MedPerson),
        );
        setLoading(false);
      },
      (err) => {
        console.error("persons listener", err);
        setLoading(false);
      },
    );
  }, [user]);

  const addPerson = async (name: string): Promise<string | undefined> => {
    if (!user || !name.trim()) return;
    const ref = await addDoc(collection(db, "users", user.uid, "medPersons"), {
      name: name.trim(),
      createdAt: Date.now(),
    });
    return ref.id;
  };

  const renamePerson = async (id: string, name: string) => {
    if (!user || !name.trim()) return;
    await updateDoc(doc(db, "users", user.uid, "medPersons", id), {
      name: name.trim(),
    });
  };

  const deletePerson = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "medPersons", id));
  };

  return { persons, loading, addPerson, renamePerson, deletePerson };
}
