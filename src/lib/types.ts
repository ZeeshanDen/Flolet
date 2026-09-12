export type SplitType = "equal" | "exact" | "percent" | "shares" | "adjustment";

export interface Category {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // hex
  order: number;
}

/** A person medicines belong to (family member) — local profile, no account. */
export interface MedPerson {
  id: string;
  name: string;
  createdAt: number;
}

export type MedSlot = "morning" | "afternoon" | "evening" | "night";

export type MedSchedule =
  | { type: "daily"; slots: MedSlot[] } // 3×/day = 3 slots; night-only = ["night"]
  | { type: "weekly"; weekday: number }; // 0 (Sun) – 6 (Sat)

export interface Medicine {
  id: string;
  name: string; // plaintext when the vault is off
  /** E2E payload ({ name, notes }) — present when the vault is enabled. */
  enc?: { iv: string; ct: string };
  unit: string; // "tablet" | "ml" | "injection" | "sachet" | "drop"
  unitsPerDose: number; // units consumed per intake, > 0
  schedule: MedSchedule;
  stock: number; // units on hand as of stockAsOf
  stockAsOf: string; // ISO yyyy-mm-dd, local date
  personId?: string; // MedPerson id; absent = unassigned
  // Pricing (optional): per pack/strip, for the monthly-cost view.
  packUnits?: number; // units in one pack (e.g. 15-tablet strip)
  packMrp?: number; // printed MRP per pack
  packPrice?: number; // what you actually pay per pack
  notes?: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  amount: number; // in major currency units (e.g. dollars)
  categoryId: string;
  name?: string; // plaintext (pre-vault docs, or vault disabled)
  note?: string;
  date: string; // ISO yyyy-mm-dd
  createdAt: number; // epoch ms
  isShared: boolean;
  /** E2E-encrypted payload ({ name }) — present when the vault is enabled. */
  enc?: { iv: string; ct: string };
}

export interface GroupExpense {
  id: string;
  amount: number;
  categoryId: string;
  name?: string;
  date: string;
  createdAt: number;
  paidBy: string; // uid
  splitType: SplitType;
  splitInput: Record<string, number>; // raw per-member input
  shares: Record<string, number>; // resolved owed per member (sums to amount)
  createdBy: string;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  memberUids: string[];
  members: Record<string, GroupMember>; // uid -> display info snapshot
  currency: string;
  createdAt: number;
}

export interface GroupMember {
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface Settlement {
  id: string;
  fromUid: string;
  toUid: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: number;
}

export interface Invite {
  id: string;
  groupId: string;
  groupName: string;
  invitedEmail: string;
  invitedByUid: string;
  invitedByName: string;
  status: "pending" | "accepted";
  createdAt: number;
}

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: number;
  defaultCurrency: string;
}
