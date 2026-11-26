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
// Subject shapes across banks: AU/SBI/ICICI say "transaction alert";
// Axis says "INR ... spent on credit card no. XXNNNN".
var SUBJECT_QUERY =
  'subject:("transaction alert" OR "spent on credit card")';
// ────────────────────────────────────────────────────────────────────────

// Map merchant keywords → category NAMES exactly as they appear in your
// Flowlet app (Profile → Manage categories). The script fetches your
// categories each run and resolves names to ids, so custom categories work.
// First matching rule wins — put specific merchants before generic keywords.
var CATEGORY_RULES = [
  // Anything "medic/medico/medical" defaults to Mom Health (recategorize to
  // Health by hand when it's not hers).
  { re: /MEDIC/i, cat: "Mom Health" }, // medico / medical / medplus
  { re: /PHARM|APOLLO|NETMEDS|1MG|PRACTO|HOSPITAL|CLINIC|DIAGNOST/i, cat: "Health" },
  { re: /INSTAMART/i, cat: "Groceries" }, // before Swiggy: Instamart is grocery
  { re: /SWIGGY|ZOMATO|BLINKIT|EATCLUB|DOMINO|MCDONALD|KFC/i, cat: "Food" },
  { re: /ZEPTO|BIGBASKET|GROCER|DMART|JIOMART|RELIANCE FRESH/i, cat: "Groceries" },
  { re: /UBER|OLA|RAPIDO|IRCTC|REDBUS|METRO|FUEL|PETROL|HPCL|IOCL|BPCL/i, cat: "Transport" },
  { re: /AMAZON|FLIPKART|MYNTRA|AJIO|NYKAA|CROMA|MEESHO/i, cat: "Shopping" },
  { re: /ELECTRICITY|BSES|AIRTEL|JIO|VI |VODAFONE|BROADBAND|DTH|BILLDESK|RECHARGE/i, cat: "Bills" },
  { re: /RENT|NOBROKER/i, cat: "Rent" },
  { re: /BOOK ?MY ?SHO|NETFLIX|SPOTIFY|PRIME|HOTSTAR|PVR|INOX/i, cat: "Fun" },
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
        /INR\s*([\d,]+(?:\.\d+)?)\s*were spent on your AU Bank Credit Card\s*(\S+)\s*at\s*(.+?)\s*on\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
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
        /INR\s*([\d,]+(?:\.\d+)?)\s*were spent on your AU Bank Credit Card\s*(\S+)[\s\S]*?on\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
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
        /Rs\.?\s*([\d,]+(?:\.\d+)?)\s*spent on your SBI Credit Card ending(?: with)?\s*(\d+)\s*at\s*(.+?)\s*on\s*(\d{2}[-/]\d{2}[-/]\d{2,4})/i,
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
        /Rs\.?\s*([\d,]+(?:\.\d+)?)\s*spent on your SBI Credit Card[\s\S]*?on\s*(\d{2}[-/]\d{2}[-/]\d{2,4})/i,
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
  {
    // Axis Bank credit card (tabular email):
    // "Transaction Amount: INR 2710 Merchant Name: BLINKIT
    //  Axis Bank Credit Card No. XX1968 Date & Time: 08-08-2026, 14:16:16 IST"
    name: "Axis CC",
    match: /Axis Bank Credit Card/i,
    parse: function (body) {
      var m = body.match(
        /Transaction Amount:\s*INR\s*([\d,]+(?:\.\d+)?)\s*Merchant Name:\s*(.+?)\s*Axis Bank Credit Card No\.?\s*(\S+)\s*Date\s*&\s*Time:\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
      );
      if (!m || !m[1] || !m[4]) return null;
      return {
        amount: parseFloat(m[1].replace(/,/g, "")),
        merchant: cleanMerchant(m[2]),
        date: ddmmyyyyToIso(m[4]),
        card: m[3] || "",
      };
    },
  },
  {
    // ICICI debit card:
    // "A purchase of Rs. 355.46 has been made using your Debit Card linked to
    //  ICICI Bank Account XX980 on 26-Jul-26. Info: VIN*BOOK MY SHO."
    // ICICI credit card:
    // "Your ICICI Bank Credit Card XX7000 has been used for a transaction of
    //  INR 294.10 on Jul 18, 2026 at 10:14:31. Info: AMAZON PAY IN E COMMERCE."
    name: "ICICI",
    match: /ICICI Bank/i,
    parse: function (body) {
      var d = body.match(
        /purchase of Rs\.?\s*([\d,]+(?:\.\d+)?)\s*has been made using your Debit Card[\s\S]*?on\s*(\d{1,2}-[A-Za-z]{3}-\d{2,4})[.\s]*Info:\s*([^.]+)/i,
      );
      if (d && d[1] && d[2]) {
        return {
          amount: parseFloat(d[1].replace(/,/g, "")),
          merchant: cleanMerchant(d[3]),
          date: monthNameToIso(d[2]),
          card: "",
        };
      }
      var c = body.match(
        /Credit Card\s*(\S+)\s*has been used for a transaction of INR\s*([\d,]+(?:\.\d+)?)\s*on\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})[\s\S]*?Info:\s*([^.]+)/i,
      );
      if (c && c[2] && c[3]) {
        return {
          amount: parseFloat(c[2].replace(/,/g, "")),
          merchant: cleanMerchant(c[4]),
          date: monthNameToIso(c[3]),
          card: c[1] || "",
        };
      }
      return null;
    },
  },
  // Add more banks here:
  // { name: "HDFC", match: /HDFC Bank/i, parse: function (body) { ... } },
];

function cleanMerchant(raw) {
  // "UPI/ZEPTONOW" → "Zeptonow"; "VIN*BOOK MY SHO" → "Book my sho".
  // Defensive: never assume the group matched.
  if (!raw || typeof raw !== "string") return "Card spend";
  var s = raw.replace(/^UPI\//i, "").trim();
  if (s.indexOf("*") >= 0) s = s.slice(s.indexOf("*") + 1); // drop processor prefix
  s = s.replace(/[_*]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "Card spend";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function ddmmyyyyToIso(d) {
  var p = String(d || "").split(/[-\/]/);
  if (p.length !== 3) return "";
  var year = p[2].length === 2 ? "20" + p[2] : p[2]; // "26" → "2026"
  return year + "-" + p[1] + "-" + p[0];
}

var MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** "26-Jul-26" or "Jul 18, 2026" → "yyyy-mm-dd". */
function monthNameToIso(d) {
  var s = String(d || "").trim();
  var m1 = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m1) {
    var mon = MONTHS[m1[2].toLowerCase()];
    if (!mon) return "";
    var y = m1[3].length === 2 ? "20" + m1[3] : m1[3];
    return y + "-" + mon + "-" + ("0" + m1[1]).slice(-2);
  }
  var m2 = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (m2) {
    var mon2 = MONTHS[m2[1].slice(0, 3).toLowerCase()];
    if (!mon2) return "";
    return m2[3] + "-" + mon2 + "-" + ("0" + m2[2]).slice(-2);
  }
  return "";
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
    "newer_than:31d " + SUBJECT_QUERY,
    "newer_than:31d " + SUBJECT_QUERY + " -label:" + LABEL_NAME,
    "newer_than:31d from:aubank",
    "in:anywhere newer_than:31d " + SUBJECT_QUERY,
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
// How far back recategorize() looks. Widen if you've synced older history.
var RECAT_WINDOW = "newer_than:1y";

function recategorize() {
  if (FLOWLET_UID.indexOf("PASTE_") === 0)
    throw new Error("Set FLOWLET_UID in the CONFIG block first.");
  var query =
    RECAT_WINDOW + " " + SUBJECT_QUERY + " label:" + LABEL_NAME;
  var changed = 0;
  // Page through the whole labeled history, 100 threads at a time.
  var threads = [];
  for (var start = 0; ; start += 100) {
    var page = GmailApp.search(query, start, 100);
    threads = threads.concat(page);
    if (page.length < 100) break;
  }
  Logger.log("Scanning " + threads.length + " thread(s).");
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

// ── Per-MESSAGE dedupe ───────────────────────────────────────────────────
// Gmail groups alerts with identical subjects (every "Transaction Alert from
// PhonePe SBI card…") into ONE thread. Labels are per-thread, so excluding
// labelled threads silently skipped every later alert in the thread. Instead
// track processed message ids in script properties.
var PROCESSED_PREFIX = "m_";
var PROCESSED_TTL_DAYS = 120;

function processedStore() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  // Prune old ids so the store never grows past the 500KB properties cap.
  var cutoff = Date.now() - PROCESSED_TTL_DAYS * 864e5;
  Object.keys(all).forEach(function (k) {
    if (k.indexOf(PROCESSED_PREFIX) === 0 && Number(all[k]) < cutoff) {
      props.deleteProperty(k);
      delete all[k];
    }
  });
  return {
    has: function (id) { return all.hasOwnProperty(PROCESSED_PREFIX + id); },
    add: function (id) {
      var v = String(Date.now());
      props.setProperty(PROCESSED_PREFIX + id, v);
      all[PROCESSED_PREFIX + id] = v;
    },
  };
}

/** True when this email's expense doc already exists in Firestore. */
function expenseDocExists(messageId) {
  var url =
    "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
    "/databases/(default)/documents/users/" + FLOWLET_UID +
    "/expenses/gmail-" + messageId + "?mask.fieldPaths=amount";
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  return res.getResponseCode() === 200;
}

function runSync(windowQuery) {
  if (FLOWLET_UID.indexOf("PASTE_") === 0)
    throw new Error("Set FLOWLET_UID in the CONFIG block first.");
  var label = getLabel();
  var store = processedStore();
  // No -label filter: a labelled thread can still hold new messages.
  var query = windowQuery + " " + SUBJECT_QUERY;
  Logger.log("Query: " + query);

  var synced = 0, skipped = 0;
  for (var start = 0; ; start += 50) {
    var threads = GmailApp.search(query, start, 50);
    if (threads.length === 0) break;
    threads.forEach(function (thread) {
      thread.getMessages().forEach(function (msg) {
        var id = msg.getId();
        if (store.has(id)) return;
        // Already imported (by the old thread-based logic, or edited in the
        // app since): never overwrite the user's edits — just remember it.
        if (expenseDocExists(id)) { store.add(id); skipped++; return; }
        var subject = msg.getSubject() || "";
        // Gmail hard-wraps long lines; merchants can straddle a break
        // ("UPI/JANWA\nMEDICAL"), so flatten whitespace before parsing.
        var body = (msg.getPlainBody() || "").replace(/\s+/g, " ");
        for (var i = 0; i < PARSERS.length; i++) {
          var p = PARSERS[i];
          if (!p.match.test(subject) && !p.match.test(body)) continue;
          var tx = p.parse(body);
          if (!tx || !(tx.amount > 0) || !tx.date) continue;
          if (writeExpense(id, tx)) synced++;
          break;
        }
        // Mark even unparseable mail so it isn't re-read every 10 minutes.
        store.add(id);
      });
      thread.addLabel(label); // visual marker only — no longer used to skip
    });
    if (threads.length < 50) break;
  }
  Logger.log("Synced " + synced + " new expense(s); " + skipped + " already in Flowlet.");
}

/** One-time: pick up alerts the old thread-label logic missed (last 31 days). */
function recoverMissed() {
  runSync("newer_than:31d");
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
    return false;
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
  Logger.log("Added: " + tx.date + " ₹" + tx.amount + " " + tx.merchant);
  return true;
}
