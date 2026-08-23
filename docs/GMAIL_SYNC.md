# Gmail → Flowlet expense auto-sync

Auto-log expenses from bank transaction alert emails (e.g. AU Bank credit card). Runs as a **Google Apps Script inside your own Google account** — no server, no OAuth app review, free. It scans new alerts every few minutes, parses amount/merchant/date, and writes the expense to your Flowlet account in Firestore.

Works with the E2E vault: the script writes the merchant name in plaintext (it never has your vault key); the app's background migration seals it into your encrypted vault the next time you open Flowlet.

## One-time setup (per inbox)

### 1. Get your Flowlet User ID
Open Flowlet → **Profile** → copy the **User ID** shown under your email.

### 2. Create the script
1. In the Google account that receives the alerts, open [script.google.com](https://script.google.com) → **New project**.
2. Replace the editor contents with [`scripts/gmail-expense-sync.gs`](../scripts/gmail-expense-sync.gs).
3. Fill the CONFIG block: paste your `FLOWLET_UID`.
4. **Project Settings ⚙ → check "Show appsscript.json"**, then set the manifest to:

```json
{
  "timeZone": "Asia/Kolkata",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

### 3. Authorize + test
Run ▶ `syncExpenses` once from the editor. Grant the permission prompts (it's your own script — the "unverified app" warning is expected; Advanced → Go to project). Check Flowlet History: the recent AU Bank transactions should appear.

### 4. Schedule it
Triggers (⏰ icon) → **Add trigger** → `syncExpenses` → time-driven → every **10 minutes**.

## Second inbox

Two options:

- **Auto-forward (simplest):** in the second Gmail, Settings → Forwarding → add a filter "from:aubank subject:transaction alert" → forward to the first inbox. One script handles both.
- **Second script:** repeat setup in the other account, **and** grant that email write access: Google Cloud Console → IAM (project `flowlet-dev`) → Grant access → the second email → role **Cloud Datastore User**. (The project owner's own inbox needs no grant.)

## How duplicates are prevented
- Processed threads get the Gmail label `Flowlet/Synced` and are excluded from later searches.
- The Firestore document id is `gmail-<messageId>` — re-running can only overwrite the same doc, never duplicate it.

## Adding more banks
Each format is one entry in `PARSERS` (subject matcher + regex over the body). Paste a sample alert into an issue/note and add a parser like the AU Bank one.

## Category mapping
`CATEGORY_RULES` maps merchant keywords to Flowlet's seeded categories (`default-0` Food … `default-9` Other). Edit freely — e.g. add your local grocery store's UPI name to the Groceries rule. Anything unmatched lands in **Other**; recategorize in History (tap the row) and refine the rules over time.

## Limits, honestly
- Alerts arriving faster than the trigger interval sync on the next run (max ~10 min lag).
- Refunds/credits aren't parsed (the AU regex only matches "were spent").
- If AU Bank rewords its template, the regex needs a matching tweak.
