# Flowlet — project notes for Claude

Expense tracker + Splitwise-style bill split PWA. React 18 + TS + Vite + Tailwind + Firebase (Auth/Firestore/Hosting). Live: https://flowlet-dev.web.app · Firebase project: `flowlet-dev`.

## Commands

- `npm run dev` — dev server (use `.claude/launch.json` "dev" for preview)
- `npm run build` — `tsc -b` + vite build (run before every deploy)
- `npm test` — vitest (split math in `src/features/split/splitCalc.test.ts`)
- `firebase deploy --only hosting,firestore:rules --project flowlet-dev`
- `node scripts/gen-icons.mjs` — regenerate PWA icons from the wallet mark

## Architecture

- `src/features/<domain>/` — feature folders; hooks own Firestore access (`useExpenses`, `useCategories`, `useGroups`), screens consume hooks.
- Data model: `users/{uid}/expenses|categories`, `groups/{groupId}/expenses|settlements`, `invites/{id}`. Types in `src/lib/types.ts`.
- Split math: `resolveSplit`/`validateSplit` in `splitCalc.ts` — 5 types (equal/exact/percent/shares/adjustment), cent-exact reconciliation. Don't touch without running tests.
- Theming: CSS vars in `src/index.css` (dark default, `:root[data-theme="light"]`), consumed via Tailwind `rgb(var(--x))` colors. Brand violet `#8b5cf6`.
- Overlays: `src/components/BottomSheet.tsx` portal; entry screen is "focus mode" — numpad/split/add-category all live in sheets.
- Routing (`App.tsx`): logged-out → `/` landing + `/auth`; unverified → `VerifyEmail`; verified → tab app.

## Hard-won gotchas

- **Firestore rejects `undefined` field values.** Omit optional fields (`photoURL` etc.) instead of setting undefined. Bit us twice.
- **Real Firestore needs composite indexes the emulator doesn't.** Keep queries single-`orderBy` + client-side tie-break (see `useExpenses`). Don't add multi-field `orderBy` without deploying an index.
- **Email verification is enforced in `firestore.rules`** (`signedIn()` requires `email_verified`). UI gating alone is bypassable — keep the rules gate when editing rules.
- **iOS standalone PWA:** body uses `100dvh` + `overflow: hidden`; only inner regions scroll. Full-page scrollers (landing) need their own `h-full overflow-y-auto` wrapper.
- Profile/category seeding happens **only after** email verification (`ensureProfile` in AuthContext).
- Emulator ports are non-default (auth 9877, firestore 8567, ui 4173) — defaults are taken by another local project.
- `.env.local` holds the Firebase web config (gitignored); `VITE_USE_EMULATOR=true` forces emulator.

## Conventions

- Path alias `@/` → `src/`.
- `cn()` from `src/lib/utils.ts` for class merging; money via `formatMoney`/`currencySymbol` (INR default).
- Icons: lucide-react only; category icons resolved by name through `CategoryIcon`.
- Keep copy honest on privacy: TLS + at-rest encryption is true; E2E encryption is roadmap, not shipped.
