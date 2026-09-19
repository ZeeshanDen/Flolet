// Shared data types — mirrors the web app's src/lib/types.ts (same Firestore docs).

export interface MedPerson {
  id: string;
  name: string;
  createdAt: number;
}

export type MedSlot = "morning" | "afternoon" | "evening" | "night";

export type MedSchedule =
  | { type: "daily"; slots: MedSlot[] }
  | { type: "weekly"; weekday: number }; // 0 (Sun) – 6 (Sat)

export interface Medicine {
  id: string;
  name: string;
  enc?: { iv: string; ct: string }; // E2E payload ({ name, notes }) when vault on
  unit: string;
  unitsPerDose: number;
  schedule: MedSchedule;
  stock: number;
  stockAsOf: string; // ISO yyyy-mm-dd, local
  personId?: string;
  packUnits?: number;
  packMrp?: number;
  packPrice?: number;
  notes?: string;
  createdAt: number;
}

export interface VaultMeta {
  version: 1;
  salt: string; // base64
  iterations: number;
  wrappedMK: { iv: string; ct: string };
  check: { iv: string; ct: string };
  createdAt: number;
}
