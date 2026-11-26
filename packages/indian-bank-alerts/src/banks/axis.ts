import type { BankParser, ParsedAlert } from "../types";
import { cleanMerchant, dmyToIso, last4, toAmount } from "../util";

// Tabular email, flattened:
// "Transaction Amount: INR 2710 Merchant Name: QUICKMART Axis Bank Credit Card
//  No. XX1234 Date & Time: 08-08-2026, 14:16:16 IST"
const PATTERN =
  /Transaction Amount:\s*INR\s*([\d,]+(?:\.\d+)?)\s*Merchant Name:\s*(.+?)\s*Axis Bank Credit Card No\.?\s*(\S+)\s*Date\s*&\s*Time:\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;

export const axis: BankParser = {
  bank: "axis",
  detect: (t) => /Axis Bank Credit Card/i.test(t),
  parse(body): ParsedAlert | null {
    const m = body.match(PATTERN);
    const amount = toAmount(m?.[1]);
    const date = dmyToIso(m?.[4]);
    if (!m || amount === null || date === null) return null;
    const merchantRaw = m[2].trim() || null;
    return {
      bank: "axis",
      instrument: "credit_card",
      amount,
      currency: "INR",
      merchantRaw,
      merchant: cleanMerchant(merchantRaw ?? undefined),
      date,
      cardLast4: last4(m[3]),
    };
  },
};
