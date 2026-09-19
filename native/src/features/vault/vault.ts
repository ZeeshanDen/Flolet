// Native vault: reads the same users/{uid}/vault/meta doc as the web app.
// The unwrapped master key is cached in the iOS Keychain (expo-secure-store),
// so unlocking is a one-time act per device — later launches are instant.

import { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import * as SecureStore from "expo-secure-store";
import { db } from "../../lib/firebase";
import {
  unlockWithPassphrase,
  unlockWithRecoveryCode,
  decryptJson,
  keyToB64,
  keyFromB64,
} from "../../lib/crypto";
import type { VaultMeta } from "../../lib/types";

export type VaultStatus = "loading" | "none" | "locked" | "unlocked";

const keyName = (uid: string) => `flowlet-mk-${uid}`;

// Module-level singleton so every hook consumer shares one state.
let state: { status: VaultStatus; key: Uint8Array | null; meta: VaultMeta | null } =
  { status: "loading", key: null, meta: null };
const listeners = new Set<() => void>();
function setState(next: Partial<typeof state>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export async function initVault(uid: string): Promise<void> {
  setState({ status: "loading" });
  try {
    const snap = await getDoc(doc(db, "users", uid, "vault", "meta"));
    if (!snap.exists()) {
      setState({ status: "none", key: null, meta: null });
      return;
    }
    const meta = snap.data() as VaultMeta;
    const cached = await SecureStore.getItemAsync(keyName(uid));
    if (cached) {
      setState({ status: "unlocked", key: keyFromB64(cached), meta });
    } else {
      setState({ status: "locked", key: null, meta });
    }
  } catch (e) {
    console.error("vault init", e);
    setState({ status: state.meta ? "locked" : "none" });
  }
}

export async function unlockVault(
  uid: string,
  input: string,
  mode: "pass" | "recovery",
): Promise<boolean> {
  const meta = state.meta;
  if (!meta) return false;
  const key =
    mode === "pass"
      ? unlockWithPassphrase(meta, input)
      : unlockWithRecoveryCode(meta, input);
  if (!key) return false;
  await SecureStore.setItemAsync(keyName(uid), keyToB64(key));
  setState({ status: "unlocked", key });
  return true;
}

export async function clearVault(uid: string | undefined): Promise<void> {
  if (uid) await SecureStore.deleteItemAsync(keyName(uid));
  setState({ status: "loading", key: null, meta: null });
}

/** Decrypt an enc blob to its private fields; null when locked/broken. */
export function openEnc<T>(enc: { iv: string; ct: string }): T | null {
  if (!state.key) return null;
  try {
    return decryptJson<T>(state.key, enc);
  } catch {
    return null;
  }
}

export function useVault() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  const refresh = useCallback(() => state, []);
  void refresh;
  return state;
}
