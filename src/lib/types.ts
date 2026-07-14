export type SplitType = "equal" | "exact" | "percent" | "shares" | "adjustment";

export interface Category {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // hex
  order: number;
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
