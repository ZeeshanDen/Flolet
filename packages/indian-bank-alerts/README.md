# indian-bank-alerts

Parse Indian bank card transaction alert emails into structured data. Zero dependencies, ESM and CommonJS, TypeScript types included.

```ts
import { parse } from "indian-bank-alerts";

parse({
  subject: "Transaction Alert from SBI Card",
  body: "Rs.470.00 spent on your SBI Credit Card ending 1234 at QUICKGROCERY on 27/10/26.",
});
// {
//   bank: "sbi",
//   instrument: "credit_card",
//   amount: 470,
//   currency: "INR",
//   merchantRaw: "QUICKGROCERY",
//   merchant: "Quickgrocery",
//   date: "2026-10-27",
//   cardLast4: "1234"
// }
```

Useful for expense trackers, Gmail add-ons and Apps Scripts, personal finance dashboards, or anything that turns bank alert mail into transactions.

## Install

```bash
npm install indian-bank-alerts
```

## What it supports

| Bank | Alert type | Notes |
| --- | --- | --- |
| AU Small Finance Bank | Credit card spend | With or without a merchant |
| SBI Card | Credit card spend | `ending with` and `ending` variants; dd-mm-yy and dd/mm/yy dates |
| Axis Bank | Credit card spend | Tabular email layout |
| ICICI Bank | Debit card purchase, credit card spend | Month-name dates (`26-Jul-26`, `Jul 18, 2026`) |

Scope, stated plainly: this covers **card spend alerts** only. Refunds, credits, UPI-from-account debits, OTPs and statements return `null`. Each format is built from one or two real samples, so a bank changing its template can break a parser; please open an issue with a redacted sample when that happens.

## API

### `parse(input: string | { subject?: string; body: string }): ParsedAlert | null`

Pass the plain-text email body (or subject and body). Whitespace is normalised for you, so merchants that the bank hard-wraps across lines are joined correctly. Returns `null` when no supported format matches.

```ts
interface ParsedAlert {
  bank: "au" | "sbi" | "axis" | "icici";
  instrument: "credit_card" | "debit_card";
  amount: number;          // rupees, e.g. 1702.5
  currency: "INR";
  merchantRaw: string | null; // as printed, e.g. "UPI/ZEPTONOW"
  merchant: string | null;    // cleaned, e.g. "Zeptonow"
  date: string;               // ISO yyyy-mm-dd, as stated in the alert
  cardLast4: string | null;
}
```

Dates are returned exactly as the alert states them. No time zone conversion is applied.

### Helpers

- `cleanMerchant("UPI/ZEPTONOW") → "Zeptonow"`, `cleanMerchant("VIN*MOVIE TIX") → "Movie tix"`
- `dmyToIso("27/10/26") → "2026-10-27"`
- `monthNameToIso("Jul 18, 2026") → "2026-07-18"`
- `parsers`: the built-in parser list, if you want to run one bank directly.

## Contributing a new bank

Every bank is one file in [`src/banks/`](src/banks) plus fixtures in [`test/parse.test.ts`](test/parse.test.ts).

1. Copy an existing parser (e.g. `src/banks/sbi.ts`) and adapt the pattern.
2. Register it in `src/index.ts`.
3. Add test cases with a **redacted** sample: replace card digits with `1234`, your name with `Customer`, and reference numbers with zeros. Never commit real alert text.
4. `npm test`

HDFC, Kotak, Yes Bank, IndusInd, IDFC First, RBL, OneCard, Paytm Payments Bank and UPI-from-account debit alerts are all wanted.

## Origin

Extracted from [Flowlet](https://github.com/ZeeshanDen/Flolet), an open-source expense tracker.

## License

MIT
