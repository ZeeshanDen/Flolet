import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  PKR: "₨",
  AED: "د.إ",
  JPY: "¥",
};

export function currencySymbol(code: string): string {
  return currencySymbols[code] ?? code + " ";
}

// Supported currencies for pickers.
export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "PKR", "AED", "JPY"];

export function formatMoney(amount: number, currency = "USD"): string {
  const sym = currencySymbol(currency);
  return sym + amount.toFixed(2);
}

/** Round to cents (2 decimals) avoiding float drift. */
export function toCents(n: number): number {
  return Math.round(n * 100);
}

export function fromCents(c: number): number {
  return c / 100;
}
