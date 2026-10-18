import { Link } from "react-router-dom";
import {
  Wallet,
  Zap,
  PieChart,
  Users,
  WifiOff,
  ShieldCheck,
  Lock,
  EyeOff,
  ArrowRight,
  UtensilsCrossed,
  ShoppingCart,
  Car,
  ShoppingBag,
} from "lucide-react";

/**
 * Public marketing landing page, shown at "/" when logged out.
 * Sign-in / sign-up live at /auth (?mode=up for signup).
 */

const FEATURES = [
  {
    icon: Zap,
    title: "Log in three taps",
    body: "Amount, category, done. A numpad-first flow built for the checkout queue, not a spreadsheet.",
  },
  {
    icon: PieChart,
    title: "Insights that read like a story",
    body: "Day-wise and month-wise category breakdowns, trends and top-spend — one glance, no digging.",
  },
  {
    icon: Users,
    title: "Split any way you like",
    body: "Equal, exact, percent, shares or adjustments. Cent-exact math, simplified debts, settle up in-app.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    body: "Installable PWA with offline persistence. Log expenses in a basement; it syncs when you surface.",
  },
];

const PRIVACY = [
  {
    icon: Lock,
    title: "End-to-end encrypted notes",
    body: "Turn on the vault and your expense notes are encrypted on-device with a key only you hold — even we can't read them. Everything else is encrypted in transit and at rest.",
  },
  {
    icon: ShieldCheck,
    title: "Verified accounts only",
    body: "Email verification is enforced at the database layer — not just the UI.",
  },
  {
    icon: EyeOff,
    title: "Your data is yours",
    body: "No ads, no selling your spending habits. Group data is visible to group members only.",
  },
];

const DEMO_CATS = [
  { icon: UtensilsCrossed, name: "Food", color: "#f97316", active: true },
  { icon: ShoppingCart, name: "Grocery", color: "#22c55e", active: false },
  { icon: Car, name: "Transport", color: "#3b82f6", active: false },
  { icon: ShoppingBag, name: "Shopping", color: "#ec4899", active: false },
];

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[290px] rounded-[38px] border-[8px] border-[#14141a] bg-bg p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-sm font-extrabold">New expense</span>
        <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] text-muted">
          Today
        </span>
      </div>

      {/* amount card */}
      <div className="flex items-center justify-between hero-card px-4 py-3.5">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-white/70">
            Amount
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-white/85">₹</span>
            <span className="text-[28px] font-extrabold leading-none text-white">
              480
            </span>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1.5 text-[10px] font-bold text-white">
          <Users size={11} />
          Split
        </span>
      </div>

      {/* categories */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {DEMO_CATS.map((c) => (
          <div
            key={c.name}
            className="flex flex-col items-center gap-1 rounded-xl border py-2"
            style={{
              background: c.active ? c.color + "22" : "rgb(var(--surface))",
              borderColor: c.active ? c.color : "rgb(var(--border))",
            }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: c.color + "2b", color: c.color }}
            >
              <c.icon size={13} />
            </span>
            <span className="text-[8px] font-semibold text-muted">
              {c.name}
            </span>
          </div>
        ))}
      </div>

      {/* mini chart bars */}
      <div className="mt-3 rounded-2xl border border-border bg-surface p-3">
        <div className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-muted">
          This week
        </div>
        <div className="flex h-16 items-end gap-1.5">
          {[35, 55, 30, 75, 45, 90, 60].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md bg-gradient-to-t from-brand/40 to-brand"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-on-brand">
        Save
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="safe-top relative mx-auto max-w-5xl px-6 pb-20">
        {/* glow */}

        {/* nav */}
        <nav className="relative flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand">
              <Wallet size={19} className="text-on-brand" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Flowlet
            </span>
          </div>
          <Link
            to="/auth"
            className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:border-brand"
          >
            Sign in
          </Link>
        </nav>

        {/* hero */}
        <header className="relative grid items-center gap-12 pt-10 md:grid-cols-2 md:pt-16">
          <div>
            <p className="mb-5 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-good" />
              Free beta
              <span className="h-px w-8 bg-border" />
              Private by design
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl">
              Money clarity,
              <br />
              without the spreadsheet.
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
              Track every rupee in three taps, see where it goes, and split
              bills with friends & family — cent-exact, argument-free.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/auth?mode=up"
                className="flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 font-bold text-on-brand transition hover:opacity-90"
              >
                Get started free
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/auth"
                className="rounded-2xl border border-border bg-surface px-6 py-3.5 font-semibold text-text transition hover:border-brand"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">
              No card required · Works on any phone · Installs like an app
            </p>
          </div>

          <div className="relative">
            <PhoneMock />
          </div>
        </header>

        {/* features */}
        <section className="relative mt-24">
          <p className="mb-4 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            <span className="h-px w-8 bg-brand/50" />
            What you get
          </p>
          <h2 className="max-w-md text-2xl font-extrabold tracking-tight md:text-3xl">
            Everything you need. Nothing you don't.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-3xl border border-border bg-surface/60 p-6 backdrop-blur transition hover:border-brand/50"
              >
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand/12 text-brand-soft">
                  <f.icon size={22} />
                </span>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* privacy */}
        <section className="relative mt-24 overflow-hidden rounded-[32px] border border-brand/25 bg-gradient-to-b from-brand/10 to-transparent p-8 md:p-12">
          <div className="relative">
            <p className="mb-4 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              <span className="h-px w-8 bg-brand/50" />
              Privacy first
            </p>
            <h2 className="max-w-lg text-2xl font-extrabold tracking-tight md:text-3xl">
              Your spending says everything about you. We keep it quiet.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PRIVACY.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border bg-bg/60 p-5 backdrop-blur"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/12 text-brand-soft">
                    <p.icon size={20} />
                  </span>
                  <h3 className="font-bold">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Know where your money goes.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Set up in under a minute. Add it to your home screen and it feels
            native.
          </p>
          <Link
            to="/auth?mode=up"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-lg font-bold text-on-brand transition hover:opacity-90"
          >
            Start tracking free
            <ArrowRight size={20} />
          </Link>
        </section>

        {/* footer */}
        <footer className="mt-20 flex flex-col items-center gap-2 border-t border-border pt-8 text-sm text-muted">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand">
              <Wallet size={13} className="text-on-brand" />
            </span>
            <span className="font-bold text-text">Flowlet</span>
          </div>
          <p>Track spending. Split with anyone.</p>
        </footer>
      </div>
    </div>
  );
}
