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

// Map merchant keywords → category NAMES exactly as they appear in your
// Flowlet app (Profile → Manage categories). The script fetches your
// categories each run and resolves names to ids, so custom categories work.
// First matching rule wins — put specific merchants before generic keywords.
var CATEGORY_RULES = [
  // Anything "medic/medico/medical" defaults to Mom Health (recategorize to
  // Health by hand when it's not hers).
  { re: /JANWA|MEDIC/i, cat: "Mom Health" },
  { re: /PHARM|APOLLO|NETMEDS|1MG|PRACTO|HOSPITAL|CLINIC|DIAGNOST/i, cat: "Health" },
  { re: /SWIGGY|ZOMATO|BLINKIT|EATCLUB|DOMINO|MCDONALD|KFC/i, cat: "Food" },
  { re: /ZEPTO|BIGBASKET|GROCER|DMART|JIOMART|RELIANCE FRESH/i, cat: "Groceries" },
  { re: /UBER|OLA|RAPIDO|IRCTC|REDBUS|METRO|FUEL|PETROL|HPCL|IOCL|BPCL/i, cat: "Transport" },
  { re: /AMAZON|FLIPKART|MYNTRA|AJIO|NYKAA|CROMA|MEESHO/i, cat: "Shopping" },
  { re: /ELECTRICITY|BSES|AIRTEL|JIO|VI |VODAFONE|BROADBAND|DTH|BILLDESK|RECHARGE/i, cat: "Bills" },
  { re: /RENT|NOBROKER/i, cat: "Rent" },
  { re: /BOOKMYSHOW|NETFLIX|SPOTIFY|PRIME|HOTSTAR|PVR|INOX/i, cat: "Fun" },
  { re: /MAKEMYTRIP|GOIBIBO|OYO|AIRBNB|INDIGO|AIRASIA|VISTARA|CLEARTRIP/i, cat: "Travel" },
];
var FALLBACK_CATEGORY_NAME = "Other";
var FALLBACK_CATEGORY_ID = "default-9"; // used only if "Other" was renamed

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
  {
    // SBI Card (incl. PhonePe SBI co-brand):
    // "Rs.217.00 spent on your SBI Credit Card ending with 8904 at MEESHOTECHNOLOGIESPRI on 22-08-26 via UPI (Ref No. ...)"
    name: "SBI Card",
    match: /SBI c(?:ard|redit card)/i,
    parse: function (body) {
      var m = body.match(
        /Rs\.?\s*([\d,]+(?:\.\d+)?)\s*spent on your SBI Credit Card ending(?: with)?\s*(\d+)\s*at\s*(.+?)\s*on\s*(\d{2}-\d{2}-\d{2,4})/i,
      );
      if (m && m[1] && m[4]) {
        return {
          amount: parseFloat(m[1].replace(/,/g, "")),
          merchant: cleanMerchant(m[3]),
          date: ddmmyyyyToIso(m[4]),
          card: m[2] || "",
        };
      }
      // Fallback: no "at MERCHANT" segment
      var f = body.match(
        /Rs\.?\s*([\d,]+(?:\.\d+)?)\s*spent on your SBI Credit Card[\s\S]*?on\s*(\d{2}-\d{2}-\d{2,4})/i,
      );
      if (f && f[1] && f[2]) {
        return {
          amount: parseFloat(f[1].replace(/,/g, "")),
          merchant: "Card spend",
          date: ddmmyyyyToIso(f[2]),
          card: "",
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
  var year = p[2].length === 2 ? "20" + p[2] : p[2]; // "26" → "2026"
  return year + "-" + p[1] + "-" + p[0];
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

/**
 * Backfill a custom range. Edit the dates, then Run ▶.
 * "after:" is inclusive, "before:" exclusive — the example below is July.
 * Omit "before:" to mean "until now".
 */
function backfillSince() {
  runSync("after:2026/07/01 before:2026/08/01");
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

/**
 * Re-apply the current CATEGORY_RULES to already-synced expenses by
 * re-reading the source emails (merchant names in Firestore may be
 * vault-encrypted; the emails are the readable source of truth).
 * Patches ONLY categoryId — names/amounts/dates stay untouched.
 * Run after editing rules. Skips docs you've deleted in the app.
 */
function recategorize() {
  if (FLOWLET_UID.indexOf("PASTE_") === 0)
    throw new Error("Set FLOWLET_UID in the CONFIG block first.");
  var query = 'newer_than:62d subject:"transaction alert" label:' + LABEL_NAME;
  var threads = GmailApp.search(query, 0, 500);
  var changed = 0;
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      var subject = msg.getSubject() || "";
      var body = (msg.getPlainBody() || "").replace(/\s+/g, " ");
      for (var i = 0; i < PARSERS.length; i++) {
        var p = PARSERS[i];
        if (!p.match.test(subject) && !p.match.test(body)) continue;
        var tx = p.parse(body);
        if (!tx || !(tx.amount > 0) || !tx.date) continue;
        var catId = categoryFor(tx.merchant);
        var url =
          "https://firestore.googleapis.com/v1/projects/" +
          FIREBASE_PROJECT_ID +
          "/databases/(default)/documents/users/" +
          FLOWLET_UID +
          "/expenses/gmail-" +
          msg.getId() +
          "?updateMask.fieldPaths=categoryId&currentDocument.exists=true";
        var res = UrlFetchApp.fetch(url, {
          method: "patch",
          contentType: "application/json",
          payload: JSON.stringify({
            fields: { categoryId: { stringValue: catId } },
          }),
          headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
          muteHttpExceptions: true,
        });
        if (res.getResponseCode() < 300) {
          changed++;
          Logger.log(tx.date + " ₹" + tx.amount + " " + tx.merchant + " → " + catId);
        }
        // 404/409 = doc was deleted in the app (e.g. a removed duplicate) — skip.
        break;
      }
    });
  });
  Logger.log("Recategorized " + changed + " expense(s).");
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
        // Gmail hard-wraps long lines; merchants can straddle a break
        // ("UPI/JANWA\nMEDICAL"), so flatten whitespace before parsing.
        var body = (msg.getPlainBody() || "").replace(/\s+/g, " ");
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

// Fetched once per run: lowercase category name → doc id.
var _categoryMap = null;

function categoryMap() {
  if (_categoryMap) return _categoryMap;
  _categoryMap = {};
  var url =
    "https://firestore.googleapis.com/v1/projects/" +
    FIREBASE_PROJECT_ID +
    "/databases/(default)/documents/users/" +
    FLOWLET_UID +
    "/categories?pageSize=300";
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() < 300) {
    var docs = (JSON.parse(res.getContentText()).documents || []);
    docs.forEach(function (d) {
      var name = d.fields && d.fields.name && d.fields.name.stringValue;
      if (!name) return;
      var id = d.name.split("/").pop();
      _categoryMap[name.toLowerCase()] = id;
    });
  } else {
    Logger.log("Couldn't fetch categories: " + res.getContentText());
  }
  return _categoryMap;
}

function categoryFor(merchant) {
  var map = categoryMap();
  for (var i = 0; i < CATEGORY_RULES.length; i++) {
    if (!CATEGORY_RULES[i].re.test(merchant)) continue;
    var id = map[CATEGORY_RULES[i].cat.toLowerCase()];
    if (id) return id;
    Logger.log(
      'Rule matched "' + CATEGORY_RULES[i].cat +
        "\" but no category with that name exists in the app — using fallback.",
    );
    break;
  }
  return map[FALLBACK_CATEGORY_NAME.toLowerCase()] || FALLBACK_CATEGORY_ID;
}

/**
 * True when a MANUALLY-entered expense with the same date + amount already
 * exists — the user logged this transaction themselves, so importing it
 * would create a duplicate. Two gmail-sourced docs never block each other
 * (two real same-amount transactions arrive as two distinct emails).
 */
function hasManualDuplicate(tx) {
  var url =
    "https://firestore.googleapis.com/v1/projects/" +
    FIREBASE_PROJECT_ID +
    "/databases/(default)/documents/users/" +
    FLOWLET_UID +
    ":runQuery";
  var body = {
    structuredQuery: {
      from: [{ collectionId: "expenses" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "date" },
                op: "EQUAL",
                value: { stringValue: tx.date },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "amount" },
                op: "EQUAL",
                value: { doubleValue: tx.amount },
              },
            },
          ],
        },
      },
      limit: 20,
    },
  };
  var res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body),
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    Logger.log("Dedupe query failed (writing anyway): " + res.getContentText());
    return false;
  }
  var rows = JSON.parse(res.getContentText());
  for (var i = 0; i < rows.length; i++) {
    var doc = rows[i].document;
    if (!doc) continue;
    var id = doc.name.split("/").pop();
    if (id.indexOf("gmail-") !== 0) return true; // manual entry exists
  }
  return false;
}

/** Write via Firestore REST. Doc id = Gmail message id → idempotent. */
function writeExpense(messageId, tx) {
  if (hasManualDuplicate(tx)) {
    Logger.log(
      "Skipped duplicate: " + tx.date + " ₹" + tx.amount + " (" + tx.merchant +
        ") — a manual entry with this date+amount already exists.",
    );
    return;
  }
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
