import type { AlertInput, BankParser, ParsedAlert } from "./types";
import { normalise } from "./util";
import { au } from "./banks/au";
import { sbi } from "./banks/sbi";
import { axis } from "./banks/axis";
import { icici } from "./banks/icici";

export type { AlertInput, Bank, BankParser, Instrument, ParsedAlert } from "./types";
export { cleanMerchant, dmyToIso, monthNameToIso } from "./util";

/** Built-in parsers, tried in order. */
export const parsers: readonly BankParser[] = [au, sbi, axis, icici];

/**
 * Parse a bank alert email into a structured card spend.
 * Accepts the plain-text body, or `{ subject, body }`. Returns `null` when no
 * supported format matches (refunds, credits, OTPs and marketing mail all
 * return `null`).
 */
export function parse(input: string | AlertInput): ParsedAlert | null {
  const { subject = "", body } =
    typeof input === "string" ? { body: input } : input;
  const text = normalise(body ?? "");
  if (!text) return null;
  const haystack = `${subject} ${text}`;
  for (const p of parsers) {
    if (!p.detect(haystack)) continue;
    const r = p.parse(text);
    if (r) return r;
  }
  return null;
}
