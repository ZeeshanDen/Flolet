export type Bank = "au" | "sbi" | "axis" | "icici";
export type Instrument = "credit_card" | "debit_card";

/** A card spend parsed from a bank alert email. */
export interface ParsedAlert {
  bank: Bank;
  instrument: Instrument;
  /** Amount in rupees, e.g. 1702.5 */
  amount: number;
  currency: "INR";
  /** Merchant as printed by the bank, e.g. "UPI/ZEPTONOW". null when absent. */
  merchantRaw: string | null;
  /** Cleaned, human-friendly merchant, e.g. "Zeptonow". null when absent. */
  merchant: string | null;
  /** Transaction date as ISO yyyy-mm-dd (as stated in the alert, no time zone shift). */
  date: string;
  /** Last four digits of the card or account, when the alert shows them. */
  cardLast4: string | null;
}

export interface AlertInput {
  subject?: string;
  body: string;
}

export interface BankParser {
  bank: Bank;
  /** Cheap pre-check on subject + body before running the full patterns. */
  detect: (text: string) => boolean;
  /** Receives whitespace-normalised body text. */
  parse: (body: string) => ParsedAlert | null;
}
