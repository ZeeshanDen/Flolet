import { describe, it, expect } from "vitest";
import { parse, cleanMerchant, dmyToIso, monthNameToIso } from "../src/index";

// All fixtures are synthetic: modelled on real alert layouts, with made-up
// card numbers, amounts and merchants. Add one per new bank/format.

describe("AU Bank credit card", () => {
  it("parses a UPI spend", () => {
    expect(
      parse({
        subject: "AU Bank Credit Card Transaction Alert",
        body: `Dear Customer,\n\nNamaskar!\n\nINR 1,110.00 were spent on your AU Bank Credit Card xx1234 at UPI/GROCERMART on 16-08-2026 at 02:10:03 pm. Click to know the available balance`,
      }),
    ).toEqual({
      bank: "au",
      instrument: "credit_card",
      amount: 1110,
      currency: "INR",
      merchantRaw: "UPI/GROCERMART",
      merchant: "Grocermart",
      date: "2026-08-16",
      cardLast4: "1234",
    });
  });

  it("joins a merchant hard-wrapped across lines", () => {
    const r = parse(
      "INR 702.00 were spent on your AU Bank Credit Card xx1234 at UPI/CITY\nMEDICAL on 22-08-2026 at 01:16:13 pm.",
    );
    expect(r?.merchant).toBe("City medical");
    expect(r?.amount).toBe(702);
  });

  it("handles alerts without a merchant", () => {
    const r = parse(
      "INR 2,500.00 were spent on your AU Bank Credit Card xx1234 on 16-08-2026 at 02:10:03 pm.",
    );
    expect(r).toMatchObject({ amount: 2500, merchant: null, merchantRaw: null, date: "2026-08-16" });
  });
});

describe("SBI Card", () => {
  it("parses the 'ending with' format with dd-mm-yy", () => {
    expect(
      parse(
        "Rs.217.00 spent on your SBI Credit Card ending with 1234 at ONLINESTOREPVT on 22-08-26 via UPI (Ref No. 000000000000).",
      ),
    ).toMatchObject({
      bank: "sbi",
      amount: 217,
      merchant: "Onlinestorepvt",
      date: "2026-08-22",
      cardLast4: "1234",
    });
  });

  it("parses the newer 'ending' format with dd/mm/yy", () => {
    expect(
      parse({
        subject: "Transaction Alert from SBI Card",
        body: "Rs.470.00 spent on your SBI Credit Card ending 1234 at QUICKGROCERY on 27/10/26. Trxn. not done by you?",
      }),
    ).toMatchObject({ amount: 470, merchant: "Quickgrocery", date: "2026-10-27" });
  });
});

describe("Axis Bank credit card", () => {
  it("parses the tabular layout", () => {
    expect(
      parse(`Here's the summary of your Axis Bank Credit Card Transaction:
        Transaction Amount:
        INR 2710
        Merchant Name:
        QUICKMART
        Axis Bank Credit Card No.
        XX1234
        Date & Time:
        08-08-2026, 14:16:16 IST`),
    ).toMatchObject({
      bank: "axis",
      amount: 2710,
      merchant: "Quickmart",
      date: "2026-08-08",
      cardLast4: "1234",
    });
  });
});

describe("ICICI Bank", () => {
  it("parses a debit card purchase", () => {
    expect(
      parse(
        "A purchase of Rs. 355.46 has been made using your Debit Card linked to ICICI Bank Account XX123 on 26-Jul-26. Info: VIN*MOVIE TIX. The Available Balance in your account is Rs. 9,999.00.",
      ),
    ).toMatchObject({
      bank: "icici",
      instrument: "debit_card",
      amount: 355.46,
      merchant: "Movie tix",
      date: "2026-07-26",
      cardLast4: "123",
    });
  });

  it("parses a credit card transaction", () => {
    expect(
      parse(
        "Your ICICI Bank Credit Card XX1234 has been used for a transaction of INR 294.10 on Jul 18, 2026 at 10:14:31. Info: ONLINE STORE PAYMENTS. The Available Credit Limit on your card is INR 1,00,000.00",
      ),
    ).toMatchObject({
      instrument: "credit_card",
      amount: 294.1,
      merchant: "Online store payments",
      date: "2026-07-18",
      cardLast4: "1234",
    });
  });
});

describe("non-matches return null", () => {
  it.each([
    ["empty", ""],
    ["OTP", "Your OTP for transaction is 123456. Do not share it with anyone."],
    ["refund", "Rs.500.00 has been credited to your SBI Credit Card ending 1234 as a refund."],
    ["marketing", "Convert your purchases above INR 2000 into easy EMIs with your AU Bank Credit Card."],
    ["impossible date", "Rs.10.00 spent on your SBI Credit Card ending 1234 at SHOP on 45/13/26."],
  ])("%s", (_, body) => {
    expect(parse(body)).toBeNull();
  });
});

describe("helpers", () => {
  it("cleanMerchant", () => {
    expect(cleanMerchant("UPI/GROCERMART")).toBe("Grocermart");
    expect(cleanMerchant("VIN*MOVIE  TIX")).toBe("Movie tix");
    expect(cleanMerchant("")).toBeNull();
  });
  it("date helpers", () => {
    expect(dmyToIso("27/10/26")).toBe("2026-10-27");
    expect(dmyToIso("1-2-2026")).toBe("2026-02-01");
    expect(dmyToIso("31/02/2026x")).toBeNull();
    expect(monthNameToIso("Jul 18, 2026")).toBe("2026-07-18");
    expect(monthNameToIso("September 3, 2026")).toBe("2026-09-03");
    expect(monthNameToIso("26-Foo-26")).toBeNull();
  });
});
