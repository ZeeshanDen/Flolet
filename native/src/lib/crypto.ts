// Vault crypto compatible with the web app (WebCrypto) format:
// PBKDF2-SHA256 → KEK, AES-256-GCM blobs as { iv: b64, ct: b64(cipher||tag) }.
// Pure JS (@noble) so it runs in Expo Go; the unwrapped master key is cached
// in the iOS Keychain via expo-secure-store.

import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { Base64 } from "js-base64";
import type { VaultMeta } from "./types";

export interface EncBlob {
  iv: string;
  ct: string;
}

const utf8 = {
  encode: (s: string) => new TextEncoder().encode(s),
  decode: (b: Uint8Array) => new TextDecoder().decode(b),
};

const b64ToBytes = (s: string) => Base64.toUint8Array(s);

function deriveKek(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Uint8Array {
  return pbkdf2(sha256, utf8.encode(passphrase.normalize("NFKC")), salt, {
    c: iterations,
    dkLen: 32,
  });
}

function decryptBlob(key: Uint8Array, blob: EncBlob): Uint8Array {
  return gcm(key, b64ToBytes(blob.iv)).decrypt(b64ToBytes(blob.ct));
}

export function decryptJson<T>(key: Uint8Array, blob: EncBlob): T {
  return JSON.parse(utf8.decode(decryptBlob(key, blob))) as T;
}

/** Unlock with the passphrase; null when wrong. Slow (~seconds): pure-JS PBKDF2. */
export function unlockWithPassphrase(
  meta: VaultMeta,
  passphrase: string,
): Uint8Array | null {
  try {
    const kek = deriveKek(passphrase, b64ToBytes(meta.salt), meta.iterations);
    const rawMK = decryptBlob(kek, meta.wrappedMK);
    decryptJson(rawMK, meta.check); // verify
    return rawMK;
  } catch {
    return null;
  }
}

/** Unlock with the recovery code (the raw master key, dash-grouped base64). */
export function unlockWithRecoveryCode(
  meta: VaultMeta,
  code: string,
): Uint8Array | null {
  try {
    const rawMK = b64ToBytes(code.replace(/[^A-Za-z0-9+/=]/g, ""));
    if (rawMK.length !== 32) return null;
    decryptJson(rawMK, meta.check);
    return rawMK;
  } catch {
    return null;
  }
}

export const keyToB64 = (k: Uint8Array) => Base64.fromUint8Array(k);
export const keyFromB64 = (s: string) => Base64.toUint8Array(s);
