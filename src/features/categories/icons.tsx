import {
  UtensilsCrossed,
  ShoppingCart,
  Car,
  ShoppingBag,
  ReceiptText,
  Home,
  HeartPulse,
  PartyPopper,
  Plane,
  CircleDollarSign,
  Coffee,
  Fuel,
  Gift,
  Dumbbell,
  BookOpen,
  Smartphone,
  Dog,
  Baby,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingCart,
  Car,
  ShoppingBag,
  ReceiptText,
  Home,
  HeartPulse,
  PartyPopper,
  Plane,
  CircleDollarSign,
  Coffee,
  Fuel,
  Gift,
  Dumbbell,
  BookOpen,
  Smartphone,
  Dog,
  Baby,
};

// Icons offered when creating a custom category.
export const PICKABLE_ICONS = Object.keys(ICONS);

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

export function CategoryIcon({
  name,
  size = 22,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[name] ?? CircleDollarSign;
  return <Icon size={size} className={className} />;
}
