// Money helpers — mirrors the web app's src/lib/utils.ts.

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  PKR: "₨",
  AED: "د.إ",
  JPY: "¥",
};

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "PKR", "AED", "JPY"];

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code;
}

export function formatMoney(amount: number, currency: string): string {
  const sym = currencySymbol(currency);
  const fixed =
    Math.abs(amount - Math.round(amount)) < 0.005
      ? String(Math.round(amount))
      : amount.toFixed(2);
  return `${sym}${fixed}`;
}
