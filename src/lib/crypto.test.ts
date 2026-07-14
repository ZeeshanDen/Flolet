import { describe, it, expect } from "vitest";
import {
  createVault,
  unlockWithPassphrase,
  unlockWithRecoveryCode,
  encryptJson,
  decryptJson,
} from "./crypto";

describe("vault crypto", () => {
  it("round-trips data through the master key", async () => {
    const { key } = await createVault("correct horse battery");
    const blob = await encryptJson(key, { name: "chai with Aditi" });
    expect(blob.iv).toBeTruthy();
    expect(blob.ct).not.toContain("chai");
    const out = await decryptJson<{ name: string }>(key, blob);
    expect(out.name).toBe("chai with Aditi");
  });

  it("unlocks with the right passphrase, rejects the wrong one", async () => {
    const { meta, key } = await createVault("correct horse battery");
    const blob = await encryptJson(key, { name: "rent" });

    const good = await unlockWithPassphrase(meta, "correct horse battery");
    expect(good).not.toBeNull();
    expect((await decryptJson<{ name: string }>(good!, blob)).name).toBe(
      "rent",
    );

    expect(await unlockWithPassphrase(meta, "wrong passphrase")).toBeNull();
  });

  it("unlocks with the recovery code, rejects a bogus one", async () => {
    const { meta, key, recoveryCode } = await createVault("hunter2hunter2");
    const blob = await encryptJson(key, { name: "fuel" });

    const viaCode = await unlockWithRecoveryCode(meta, recoveryCode);
    expect(viaCode).not.toBeNull();
    expect((await decryptJson<{ name: string }>(viaCode!, blob)).name).toBe(
      "fuel",
    );

    expect(await unlockWithRecoveryCode(meta, "AAAA-BBBB-CCCC")).toBeNull();
  });

  it("produces unique IVs per encryption", async () => {
    const { key } = await createVault("hunter2hunter2");
    const a = await encryptJson(key, { name: "x" });
    const b = await encryptJson(key, { name: "x" });
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });
}, 30_000);
