// Category icon mapping: web stores lucide icon names in Firestore; render
// the closest Ionicons equivalent natively so both apps share the same data.
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type IonName = ComponentProps<typeof Ionicons>["name"];

const LUCIDE_TO_ION: Record<string, IonName> = {
  UtensilsCrossed: "restaurant",
  ShoppingCart: "cart",
  Car: "car",
  ShoppingBag: "bag-handle",
  ReceiptText: "receipt",
  Home: "home",
  HeartPulse: "heart",
  PartyPopper: "sparkles",
  Plane: "airplane",
  CircleDollarSign: "cash",
  Coffee: "cafe",
  Fuel: "speedometer",
  Gift: "gift",
  Dumbbell: "barbell",
  BookOpen: "book",
  Smartphone: "phone-portrait",
  Dog: "paw",
  Baby: "happy",
};

export function CategoryIcon({
  name,
  size = 18,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <Ionicons name={LUCIDE_TO_ION[name] ?? "cash"} size={size} color={color} />
  );
}

export const PICKABLE_ICONS = Object.keys(LUCIDE_TO_ION);
export const PICKABLE_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#ec4899",
  "#eab308",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#14b8a6",
  "#94a3b8",
];
