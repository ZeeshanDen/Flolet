// Expense-side types — mirrors the web app (same Firestore docs).

export interface Category {
  id: string;
  name: string;
  icon: string; // lucide name on web; mapped to Ionicons natively
  color: string;
  order: number;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  name?: string;
  date: string; // ISO yyyy-mm-dd (local)
  createdAt: number;
  isShared: boolean;
  enc?: { iv: string; ct: string };
  source?: string;
}

export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: number;
  defaultCurrency: string;
  photoURL?: string;
}
