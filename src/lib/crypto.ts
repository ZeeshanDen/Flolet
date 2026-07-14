// End-to-end encryption primitives. WebCrypto only — no dependencies.
//
// Key hierarchy:
//   passphrase --PBKDF2--> KEK --unwraps--> MK (AES-256-GCM) --encrypts--> data
// Firestore stores only { salt, wrappedMK, check } — ciphertext, useless
// without the passphrase or the recovery code (which IS the raw MK).

export interface EncBlob {
  iv: string; // base64
  ct: string; // base64
}

export interface VaultMeta {
  version: 1;
  salt: string; // base64
  iterations: number;
  wrappedMK: EncBlob; // master key encrypted with the passphrase-derived KEK
  check: EncBlob; // known plaintext encrypted with MK — verifies an unlock
  createdAt: number;
}

export const KDF_ITERATIONS = 600_000;

const te = new TextEncoder();
const td = new TextDecoder();

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

/** Derive the wrapping key (KEK) from the user's passphrase. */
export async function deriveKek(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    te.encode(passphrase.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Import raw master-key bytes as a non-extractable AES-GCM CryptoKey. */
export async function importMasterKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "AES-GCM" },
    false, // non-extractable: safe to cache in IndexedDB
    ["encrypt", "decrypt"],
  );
}

async function encryptBytes(key: CryptoKey, data: Uint8Array): Promise<EncBlob> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  return { iv: b64(iv), ct: b64(ct) };
}

async function decryptBytes(key: CryptoKey, blob: EncBlob): Promise<Uint8Array> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(blob.iv) as BufferSource },
    key,
    unb64(blob.ct) as BufferSource,
  );
  return new Uint8Array(pt);
}

/** Encrypt any JSON-serialisable value. */
export async function encryptJson(key: CryptoKey, value: unknown): Promise<EncBlob> {
  return encryptBytes(key, te.encode(JSON.stringify(value)));
}

/** Decrypt a blob produced by encryptJson. Throws on wrong key/tampering. */
export async function decryptJson<T>(key: CryptoKey, blob: EncBlob): Promise<T> {
  return JSON.parse(td.decode(await decryptBytes(key, blob))) as T;
}

/** Create a brand-new vault. Returns everything the caller needs. */
export async function createVault(passphrase: string): Promise<{
  meta: VaultMeta;
  key: CryptoKey;
  recoveryCode: string;
}> {
  const rawMK = randomBytes(32);
  const salt = randomBytes(16);
  const kek = await deriveKek(passphrase, salt, KDF_ITERATIONS);
  const wrappedMK = await encryptBytes(kek, rawMK);
  const key = await importMasterKey(rawMK);
  const check = await encryptJson(key, { v: 1 });
  return {
    meta: {
      version: 1,
      salt: b64(salt),
      iterations: KDF_ITERATIONS,
      wrappedMK,
      check,
      createdAt: Date.now(),
    },
    key,
    recoveryCode: formatRecoveryCode(rawMK),
  };
}

/** Unlock with the passphrase. Returns null when the passphrase is wrong. */
export async function unlockWithPassphrase(
  meta: VaultMeta,
  passphrase: string,
): Promise<CryptoKey | null> {
  try {
    const kek = await deriveKek(passphrase, unb64(meta.salt), meta.iterations);
    const rawMK = await decryptBytes(kek, meta.wrappedMK);
    const key = await importMasterKey(rawMK);
    await decryptJson(key, meta.check); // verifies the key end-to-end
    return key;
  } catch {
    return null;
  }
}

/** Unlock with the recovery code (which is the master key itself). */
export async function unlockWithRecoveryCode(
  meta: VaultMeta,
  code: string,
): Promise<CryptoKey | null> {
  try {
    const rawMK = parseRecoveryCode(code);
    if (rawMK.length !== 32) return null;
    const key = await importMasterKey(rawMK);
    await decryptJson(key, meta.check);
    return key;
  } catch {
    return null;
  }
}

/** Human-friendly grouping: XXXX-XXXX-… (base64, 44 chars → 11 groups). */
export function formatRecoveryCode(rawMK: Uint8Array): string {
  const s = b64(rawMK);
  return s.match(/.{1,4}/g)!.join("-");
}

function parseRecoveryCode(code: string): Uint8Array {
  return unb64(code.replace(/[^A-Za-z0-9+/=]/g, ""));
}
