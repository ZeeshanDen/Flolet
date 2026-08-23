/**
 * Flowlet — Gmail expense auto-sync (Google Apps Script)
 *
 * Scans your Gmail for bank transaction alert emails, parses amount /
 * merchant / date, and writes expenses straight into Flowlet's Firestore.
 * Runs entirely inside YOUR Google account — no server, no OAuth app,
 * no cost. See docs/GMAIL_SYNC.md in the repo for setup steps.
 *
 * Dedupe: every synced email gets the Gmail label below; labeled mail is
 * never processed twice. The Firestore doc id is the Gmail message id, so
 * even a re-run can't double-write.
 */

// ── CONFIG — fill these in ──────────────────────────────────────────────
var FIREBASE_PROJECT_ID = "flowlet-dev";
var FLOWLET_UID = "PASTE_YOUR_FIREBASE_UID_HERE"; // Profile → User ID → copy
var LABEL_NAME = "Flowlet/Synced";
var SEARCH_WINDOW = "newer_than:2d"; // how far back each run looks
// ────────────────────────────────────────────────────────────────────────

// Map merchant keywords → Flowlet default category ids (default-0 … default-9).
var CATEGORY_RULES = [
  { re: /ZEPTO|SWIGGY|ZOMATO|BLINKIT|EATCLUB|DOMINO|MCDONALD|KFC/i, cat: "default-0" }, // Food
  { re: /BIGBASKET|GROCER|DMART|JIOMART|RELIANCE FRESH/i, cat: "default-1" }, // Groceries
  { re: /UBER|OLA|RAPIDO|IRCTC|REDBUS|METRO|FUEL|PETROL|HPCL|IOCL|BPCL/i, cat: "default-2" }, // Transport
  { re: /AMAZON|FLIPKART|MYNTRA|AJIO|NYKAA|CROMA/i, cat: "default-3" }, // Shopping
  { re: /ELECTRICITY|BSES|AIRTEL|JIO|VI |VODAFONE|BROADBAND|DTH|BILLDESK|RECHARGE/i, cat: "default-4" }, // Bills
  { re: /RENT|NOBROKER/i, cat: "default-5" }, // Rent
  { re: /PHARM|APOLLO|MEDPLUS|NETMEDS|1MG|PRACTO|HOSPITAL|CLINIC|DIAGNOST/i, cat: "default-6" }, // Health
  { re: /BOOKMYSHOW|NETFLIX|SPOTIFY|PRIME|HOTSTAR|PVR|INOX/i, cat: "default-7" }, // Fun
  { re: /MAKEMYTRIP|GOIBIBO|OYO|AIRBNB|INDIGO|AIRASIA|VISTARA|CLEARTRIP/i, cat: "default-8" }, // Travel
];
var FALLBACK_CATEGORY = "default-9"; // Other

// Bank email parsers. Add one entry per bank/format.
var PARSERS = [
  {
    // AU Bank credit card:
    // "INR 110.00 were spent on your AU Bank Credit Card xx4693 at UPI/ZEPTONOW on 16-08-2026 at 02:10:03 pm"
    name: "AU Bank CC",
    match: /AU Bank Credit Card Transaction Alert/i, // subject
    parse: function (body) {
      // Primary: "INR 110.00 were spent on your ... xx4693 at UPI/ZEPTONOW on 16-08-2026"
      var m = body.match(
        /INR\s*([\d,]+(?:\.\d+)?)\s*were spent on your AU Bank Credit Card\s*(\S+)\s*at\s*(.+?)\s*on\s*(\d{2}-\d{2}-\d{4})/i,
      );
      if (m && m[1] && m[4]) {
        return {
          amount: parseFloat(m[1].replace(/,/g, "")),
          merchant: cleanMerchant(m[3]),
          date: ddmmyyyyToIso(m[4]),
          card: m[2] || "",
        };
      }
      // Fallback: variants without an "at MERCHANT" segment (ATM/POS etc.)
      var f = body.match(
        /INR\s*([\d,]+(?:\.\d+)?)\s*were spent on your AU Bank Credit Card\s*(\S+)[\s\S]*?on\s*(\d{2}-\d{2}-\d{4})/i,
      );
      if (f && f[1] && f[3]) {
        return {
          amount: parseFloat(f[1].replace(/,/g, "")),
          merchant: "Card spend",
          date: ddmmyyyyToIso(f[3]),
          card: f[2] || "",
        };
      }
      return null;
    },
  },
  // Add more banks here:
  // { name: "HDFC", match: /HDFC Bank/i, parse: function (body) { ... } },
];

function cleanMerchant(raw) {
  // "UPI/ZEPTONOW" → "Zeptonow". Defensive: never assume the group matched.
  if (!raw || typeof raw !== "string") return "Card spend";
  var s = raw.replace(/^UPI\//i, "").replace(/[_*]/g, " ").trim();
  if (!s) return "Card spend";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function ddmmyyyyToIso(d) {
  var p = String(d || "").split("-");
  if (p.length !== 3) return "";
  return p[2] + "-" + p[1] + "-" + p[0];
}

function getLabel() {
  return (
    GmailApp.getUserLabelByName(LABEL_NAME) || GmailApp.createLabel(LABEL_NAME)
  );
}

/** Entry point — attach a time-driven trigger (every 10–15 min) to this. */
function syncExpenses() {
  runSync(SEARCH_WINDOW);
}

/**
 * One-time backfill: imports every alert from the last N days (default 31 —
 * covers the current month). Run manually from the editor. Safe to re-run:
 * doc ids are Gmail message ids, so existing entries are overwritten, never
 * duplicated.
 */
function backfillMonth() {
  runSync("newer_than:31d");
}

/** Backfill a custom range instead, e.g. since a date: */
function backfillSince() {
  runSync("after:2026/08/01"); // edit the date, then Run ▶
}

/**
 * Diagnostic — run this when a sync finds nothing. Logs how many threads
 * each candidate query matches so you can see where the emails actually are.
 */
function debugSearch() {
  [
    'newer_than:31d subject:"transaction alert"',
    'newer_than:31d subject:"transaction alert" -label:' + LABEL_NAME,
    "newer_than:31d from:aubank",
    'in:anywhere newer_than:31d subject:"transaction alert"',
    "newer_than:31d AU Bank Credit Card",
    "label:" + LABEL_NAME,
  ].forEach(function (q) {
    Logger.log('"' + q + '" → ' + GmailApp.search(q, 0, 100).length + " thread(s)");
  });
}

/** Un-label everything so the next sync reprocesses from scratch. */
function resetSyncedLabel() {
  var label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) return Logger.log("No label to reset.");
  var threads = GmailApp.search("label:" + LABEL_NAME, 0, 500);
  threads.forEach(function (t) {
    t.removeLabel(label);
  });
  Logger.log("Removed label from " + threads.length + " thread(s).");
}

function runSync(windowQuery) {
  if (FLOWLET_UID.indexOf("PASTE_") === 0)
    throw new Error("Set FLOWLET_UID in the CONFIG block first.");
  var label = getLabel();
  var query =
    windowQuery + ' subject:"transaction alert" -label:' + LABEL_NAME;
  Logger.log("Query: " + query);

  var synced = 0;
  // Page through in chunks of 50 threads until the search is exhausted.
  for (;;) {
    var threads = GmailApp.search(query, 0, 50);
    Logger.log("Matched " + threads.length + " thread(s) this page.");
    if (threads.length === 0) break;
    threads.forEach(function (thread) {
      thread.getMessages().forEach(function (msg) {
        var subject = msg.getSubject() || "";
        var body = msg.getPlainBody() || "";
        for (var i = 0; i < PARSERS.length; i++) {
          var p = PARSERS[i];
          if (!p.match.test(subject) && !p.match.test(body)) continue;
          var tx = p.parse(body);
          if (!tx || !(tx.amount > 0) || !tx.date) continue;
          writeExpense(msg.getId(), tx);
          synced++;
          break;
        }
      });
      thread.addLabel(label); // labeling removes it from the next page's search
    });
    if (threads.length < 50) break;
  }
  Logger.log("Synced " + synced + " expense(s).");
}

function categoryFor(merchant) {
  for (var i = 0; i < CATEGORY_RULES.length; i++)
    if (CATEGORY_RULES[i].re.test(merchant)) return CATEGORY_RULES[i].cat;
  return FALLBACK_CATEGORY;
}

/** Write via Firestore REST. Doc id = Gmail message id → idempotent. */
function writeExpense(messageId, tx) {
  var url =
    "https://firestore.googleapis.com/v1/projects/" +
    FIREBASE_PROJECT_ID +
    "/databases/(default)/documents/users/" +
    FLOWLET_UID +
    "/expenses/gmail-" +
    messageId;
  var doc = {
    fields: {
      amount: { doubleValue: tx.amount },
      categoryId: { stringValue: categoryFor(tx.merchant) },
      name: { stringValue: tx.merchant },
      date: { stringValue: tx.date },
      createdAt: { integerValue: String(Date.now()) },
      isShared: { booleanValue: false },
      source: { stringValue: "gmail" },
    },
  };
  var res = UrlFetchApp.fetch(url, {
    method: "patch", // create-or-replace at a known id = idempotent
    contentType: "application/json",
    payload: JSON.stringify(doc),
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300)
    throw new Error("Firestore write failed: " + res.getContentText());
}
