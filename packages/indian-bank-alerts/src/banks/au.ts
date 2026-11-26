import type { BankParser, ParsedAlert } from "../types";
import { cleanMerchant, dmyToIso, last4, toAmount } from "../util";

// "INR 110.00 were spent on your AU Bank Credit Card xx1234 at UPI/GROCERMART
//  on 16-08-2026 at 02:10:03 pm."
const WITH_MERCHANT =
  /INR\s*([\d,]+(?:\.\d+)?)\s*were spent on your AU Bank Credit Card\s*(\S+)\s*at\s*(.+?)\s*on\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;
// Variant without an "at MERCHANT" segment (ATM / POS).
const NO_MERCHANT =
  /INR\s*([\d,]+(?:\.\d+)?)\s*were spent on your AU Bank Credit Card\s*(\S+).*?on\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;

export const au: BankParser = {
  bank: "au",
  detect: (t) => /AU Bank Credit Card/i.test(t),
  parse(body): ParsedAlert | null {
    const m = body.match(WITH_MERCHANT);
    const f = m ? null : body.match(NO_MERCHANT);
    const amount = toAmount(m?.[1] ?? f?.[1]);
    const date = dmyToIso(m?.[4] ?? f?.[3]);
    if (amount === null || date === null) return null;
    const merchantRaw = m?.[3]?.trim() || null;
    return {
      bank: "au",
      instrument: "credit_card",
      amount,
      currency: "INR",
      merchantRaw,
      merchant: cleanMerchant(merchantRaw ?? undefined),
      date,
      cardLast4: last4(m?.[2] ?? f?.[2]),
    };
  },
};
