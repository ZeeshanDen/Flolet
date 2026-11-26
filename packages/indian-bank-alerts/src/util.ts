/** Collapse all whitespace (banks hard-wrap lines mid-merchant). */
export function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** "1,23,456.78" → 123456.78; NaN-safe. */
export function toAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "xx4693", "XX1968", "8904" → last four digits, or null. */
export function last4(raw: string | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length >= 3 ? digits.slice(-4) : null;
}

/**
 * "UPI/ZEPTONOW" → "Zeptonow"; "VIN*BOOK MY SHO" → "Book my sho".
 * Returns null for empty input.
 */
export function cleanMerchant(raw: string | undefined): string | null {
  if (!raw) return null;
  let s = raw.replace(/^UPI\//i, "").trim();
  const star = s.indexOf("*");
  if (star >= 0) s = s.slice(star + 1); // drop payment-processor prefix
  s = s.replace(/[_*]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function iso(y: string, m: string, d: string): string | null {
  const year = y.length === 2 ? `20${y}` : y;
  const mm = Number(m);
  const dd = Number(d);
  if (!(mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31)) return null;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** "16-08-2026", "22-08-26", "27/10/26" → ISO date. */
export function dmyToIso(raw: string | undefined): string | null {
  const m = (raw ?? "").match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  return m ? iso(m[3], m[2], m[1]) : null;
}

const MONTHS: Record<string, string> = {
  jan: "1", feb: "2", mar: "3", apr: "4", may: "5", jun: "6",
  jul: "7", aug: "8", sep: "9", oct: "10", nov: "11", dec: "12",
};

/** "26-Jul-26" or "Jul 18, 2026" → ISO date. */
export function monthNameToIso(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  const a = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/);
  if (a) {
    const mon = MONTHS[a[2].toLowerCase()];
    return mon ? iso(a[3], mon, a[1]) : null;
  }
  const b = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (b) {
    const mon = MONTHS[b[1].slice(0, 3).toLowerCase()];
    return mon ? iso(b[3], mon, b[2]) : null;
  }
  return null;
}
