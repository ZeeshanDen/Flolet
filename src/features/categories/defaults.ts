import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Category } from "@/lib/types";

// Seeded on first sign-in. icon = lucide-react icon name.
export const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Food", icon: "UtensilsCrossed", color: "#f97316", order: 0 },
  { name: "Groceries", icon: "ShoppingCart", color: "#22c55e", order: 1 },
  { name: "Transport", icon: "Car", color: "#3b82f6", order: 2 },
  { name: "Shopping", icon: "ShoppingBag", color: "#ec4899", order: 3 },
  { name: "Bills", icon: "ReceiptText", color: "#eab308", order: 4 },
  { name: "Rent", icon: "Home", color: "#8b5cf6", order: 5 },
  { name: "Health", icon: "HeartPulse", color: "#ef4444", order: 6 },
  { name: "Fun", icon: "PartyPopper", color: "#06b6d4", order: 7 },
  { name: "Travel", icon: "Plane", color: "#14b8a6", order: 8 },
  { name: "Other", icon: "CircleDollarSign", color: "#94a3b8", order: 9 },
];

export async function seedDefaultCategories(uid: string) {
  const batch = writeBatch(db);
  DEFAULT_CATEGORIES.forEach((cat, i) => {
    const ref = doc(db, "users", uid, "categories", `default-${i}`);
    batch.set(ref, cat);
  });
  await batch.commit();
}
