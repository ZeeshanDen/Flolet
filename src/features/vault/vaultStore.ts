import { create } from "zustand";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  createVault,
  unlockWithPassphrase,
  unlockWithRecoveryCode,
  type VaultMeta,
} from "@/lib/crypto";
import { getCachedKey, cacheKey, clearCachedKey } from "./keyCache";
import { migrateExpenses } from "./migrate";

/**
 * Vault lifecycle:
 *   loading  — checking IDB cache + Firestore
 *   none     — user hasn't enabled E2E encryption (everything plaintext)
 *   locked   — vault exists but this device has no key → unlock gate
 *   unlocked — key in memory, reads decrypt + writes encrypt
 */
export type VaultStatus = "loading" | "none" | "locked" | "unlocked";

interface VaultState {
  status: VaultStatus;
  key: CryptoKey | null;
  meta: VaultMeta | null;
  init: (uid: string) => Promise<void>;
  setup: (uid: string, passphrase: string) => Promise<string>;
  unlock: (uid: string, passphrase: string) => Promise<boolean>;
  unlockRecovery: (uid: string, code: string) => Promise<boolean>;
  clear: (uid: string | undefined) => Promise<void>;
}

const metaRef = (uid: string) => doc(db, "users", uid, "vault", "meta");

export const useVault = create<VaultState>((set, get) => ({
  status: "loading",
  key: null,
  meta: null,

  init: async (uid) => {
    set({ status: "loading" });
    try {
      const snap = await getDoc(metaRef(uid));
      if (!snap.exists()) {
        set({ status: "none", key: null, meta: null });
        return;
      }
      const meta = snap.data() as VaultMeta;
      const cached = await getCachedKey(uid);
      if (cached) {
        set({ status: "unlocked", key: cached, meta });
        migrateExpenses(uid, cached); // sweep any plaintext stragglers
      } else {
        set({ status: "locked", key: null, meta });
      }
    } catch (e) {
      console.error("vault init", e);
      // Fail open as "none" only if we truly couldn't read; a locked vault
      // must never silently downgrade to plaintext writes.
      if (get().meta) set({ status: "locked" });
      else set({ status: "none" });
    }
  },

  setup: async (uid, passphrase) => {
    const { meta, key, recoveryCode } = await createVault(passphrase);
    await setDoc(metaRef(uid), meta);
    await cacheKey(uid, key);
    set({ status: "unlocked", key, meta });
    migrateExpenses(uid, key); // encrypt existing plaintext notes in background
    return recoveryCode;
  },

  unlock: async (uid, passphrase) => {
    const meta = get().meta;
    if (!meta) return false;
    const key = await unlockWithPassphrase(meta, passphrase);
    if (!key) return false;
    await cacheKey(uid, key);
    set({ status: "unlocked", key });
    migrateExpenses(uid, key);
    return true;
  },

  unlockRecovery: async (uid, code) => {
    const meta = get().meta;
    if (!meta) return false;
    const key = await unlockWithRecoveryCode(meta, code);
    if (!key) return false;
    await cacheKey(uid, key);
    set({ status: "unlocked", key });
    migrateExpenses(uid, key);
    return true;
  },

  clear: async (uid) => {
    if (uid) await clearCachedKey(uid);
    set({ status: "loading", key: null, meta: null });
  },
}));
