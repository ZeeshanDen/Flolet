# Flowlet

**Track spending. Split with anyone.**

A personal-first expense tracker with Splitwise-style bill splitting, built as an installable PWA. Live at [flowlet-dev.web.app](https://flowlet-dev.web.app).

## Features

- **Fast expense entry** — amount, category, done. Numpad-first focus-mode UI; log an expense in three taps.
- **Insights** — day-wise and month-wise category breakdowns (donut + bars), totals and trends.
- **Groups & invites** — create groups, invite people by email, real accounts.
- **Five split types** — equal, exact amounts, percentages, shares (weighted), and +/- adjustments. Cent-exact reconciliation so shares always sum to the total.
- **Balances & settle up** — per-member net balances, greedy debt simplification, record settlements.
- **Manage categories** — add, edit, delete with custom icon + colour, from the Profile tab.
- **Offline-first PWA** — installable on any phone, Firestore offline persistence, syncs when back online.
- **Light/dark theme**, ₹ INR default with multi-currency support per group.

## Security & privacy

- Email verification enforced **at the Firestore rules layer** (`email_verified` required on every read/write), not just in the UI.
- Data encrypted in transit (TLS) and at rest (Google Cloud).
- Personal data readable only by its owner; group data only by group members.

## Stack

| Layer | Tech |
| --- | --- |
| UI | React 18 + TypeScript + Vite, Tailwind CSS, lucide-react, Recharts |
| State/data | TanStack Query, Zustand, Firestore realtime listeners |
| Backend | Firebase Auth (email + Google), Cloud Firestore, Firebase Hosting |
| PWA | vite-plugin-pwa (service worker, manifest, icons) |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web config
npm run dev
```

No Firebase project yet? Run against the emulator instead:

```bash
npm run emulators            # auth :9877, firestore :8567, ui :4173
VITE_USE_EMULATOR=true npm run dev
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm test` | Vitest unit tests (split math) |
| `npm run lint` | ESLint |
| `npm run emulators` | Firebase emulator suite |
| `node scripts/gen-icons.mjs` | Regenerate PWA icons |

### Deploy

```bash
npm run build
firebase deploy --only hosting,firestore:rules --project <your-project>
```

## Project layout

```
src/
  components/        AppLayout (tab shell), BottomSheet
  features/
    auth/            AuthContext, SignIn, VerifyEmail
    categories/      hooks, icons, Add/Manage sheets
    expenses/        EntryScreen (focus mode), History, Edit sheet, Numpad
    groups/          group CRUD, invites, detail screens
    insights/        charts screen
    marketing/       public landing page
    profile/         profile + settings
    split/           SplitEditor, splitCalc (+ tests), balances
  lib/               firebase init, types, theme, utils
firestore.rules      security rules (verified-email gated)
```

## Split math

All five split types resolve to per-member cent amounts that sum exactly to the total — leftover cents are distributed deterministically. See [`src/features/split/splitCalc.ts`](src/features/split/splitCalc.ts) and its 14 unit tests.

## Roadmap

- Receipt photo → OCR auto-fill
- Client-side encryption of expense payloads (E2E)
- Budgets & recurring expenses
- Custom email domain for verification mail
