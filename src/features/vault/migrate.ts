import {
  collection,
  getDocs,
  writeBatch,
  doc,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { encryptJson } from "@/lib/crypto";

let running = false;

/**
 * One-way, idempotent migration: encrypt plaintext `name` fields on existing
 * expenses into `enc`, then remove the plaintext. Runs in the background after
 * setup/unlock; safe to call repeatedly (skips docs that are already done).
 * Old docs keep working before migration — reads fall back to plaintext name.
 */
export async function migrateExpenses(uid: string, key: CryptoKey): Promise<void> {
  if (running) return;
  running = true;
  try {
    const snap = await getDocs(collection(db, "users", uid, "expenses"));
    const pending = snap.docs.filter((d) => {
      const data = d.data();
      return typeof data.name === "string" && data.name !== "" && !data.enc;
    });
    if (pending.length === 0) return;

    // Firestore batches cap at 500 ops; stay comfortably below.
    for (let i = 0; i < pending.length; i += 400) {
      const chunk = pending.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const d of chunk) {
        const enc = await encryptJson(key, { name: d.data().name as string });
        batch.update(doc(db, "users", uid, "expenses", d.id), {
          enc,
          name: deleteField(),
        });
      }
      await batch.commit();
    }
    console.info(`vault: migrated ${pending.length} expense note(s) to E2E`);
  } catch (e) {
    console.error("vault migration", e);
  } finally {
    running = false;
  }
}
