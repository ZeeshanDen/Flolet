import type { BankParser, ParsedAlert } from "../types";
import { cleanMerchant, dmyToIso, last4, toAmount } from "../util";

// "Rs.217.00 spent on your SBI Credit Card ending with 1234 at ONLINESTORE on
//  22-08-26 via UPI" — newer alerts use "ending 1234" and dd/mm/yy dates.
const WITH_MERCHANT =
  /Rs\.?\s*([\d,]+(?:\.\d+)?)\s*spent on your SBI Credit Card ending(?: with)?\s*(\d+)\s*at\s*(.+?)\s*on\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;
const NO_MERCHANT =
  /Rs\.?\s*([\d,]+(?:\.\d+)?)\s*spent on your SBI Credit Card(?: ending(?: with)?\s*(\d+))?.*?on\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;

export const sbi: BankParser = {
  bank: "sbi",
  detect: (t) => /SBI Credit Card|SBI card/i.test(t),
  parse(body): ParsedAlert | null {
    const m = body.match(WITH_MERCHANT);
    const f = m ? null : body.match(NO_MERCHANT);
    const amount = toAmount(m?.[1] ?? f?.[1]);
    const date = dmyToIso(m?.[4] ?? f?.[3]);
    if (amount === null || date === null) return null;
    const merchantRaw = m?.[3]?.trim() || null;
    return {
      bank: "sbi",
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
