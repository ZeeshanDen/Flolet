import type { BankParser, ParsedAlert } from "../types";
import { cleanMerchant, last4, monthNameToIso, toAmount } from "../util";

// Debit: "A purchase of Rs. 355.46 has been made using your Debit Card linked
//  to ICICI Bank Account XX123 on 26-Jul-26. Info: VIN*MOVIETIX."
const DEBIT =
  /purchase of Rs\.?\s*([\d,]+(?:\.\d+)?)\s*has been made using your Debit Card linked to ICICI Bank Account\s*(\S+)\s*on\s*(\d{1,2}-[A-Za-z]{3}-\d{2,4})[.\s]*Info:\s*([^.]+)/i;
// Credit: "Your ICICI Bank Credit Card XX1234 has been used for a transaction
//  of INR 294.10 on Jul 18, 2026 at 10:14:31. Info: ONLINE STORE."
const CREDIT =
  /Credit Card\s*(\S+)\s*has been used for a transaction of INR\s*([\d,]+(?:\.\d+)?)\s*on\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}).*?Info:\s*([^.]+)/i;

export const icici: BankParser = {
  bank: "icici",
  detect: (t) => /ICICI Bank/i.test(t),
  parse(body): ParsedAlert | null {
    const d = body.match(DEBIT);
    if (d) {
      const amount = toAmount(d[1]);
      const date = monthNameToIso(d[3]);
      if (amount === null || date === null) return null;
      const merchantRaw = d[4].trim() || null;
      return {
        bank: "icici",
        instrument: "debit_card",
        amount,
        currency: "INR",
        merchantRaw,
        merchant: cleanMerchant(merchantRaw ?? undefined),
        date,
        cardLast4: last4(d[2]),
      };
    }
    const c = body.match(CREDIT);
    if (c) {
      const amount = toAmount(c[2]);
      const date = monthNameToIso(c[3]);
      if (amount === null || date === null) return null;
      const merchantRaw = c[4].trim() || null;
      return {
        bank: "icici",
        instrument: "credit_card",
        amount,
        currency: "INR",
        merchantRaw,
        merchant: cleanMerchant(merchantRaw ?? undefined),
        date,
        cardLast4: last4(c[1]),
      };
    }
    return null;
  },
};
