import { Outlet, NavLink } from "react-router-dom";
import { Plus, ListOrdered, PieChart, Pill, User } from "lucide-react";
import { cn } from "@/lib/utils";

const left = [
  { to: "/history", label: "History", icon: ListOrdered },
  { to: "/insights", label: "Insights", icon: PieChart },
];
const right = [
  { to: "/meds", label: "Meds", icon: Pill },
  { to: "/profile", label: "Profile", icon: User },
];

function Tab({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof Plus;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-medium transition",
          isActive ? "text-text" : "text-muted",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "flex h-8 w-12 items-center justify-center rounded-full transition",
              isActive && "bg-raised",
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function AppLayout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="safe-top min-h-0 flex-1 overflow-y-auto pb-4">
        <Outlet />
      </main>

      {/* In-flow (not position:fixed — see iosViewport.ts). A floating dock:
          rounded bar inset from the edges, raised + in the centre for the
          primary action. */}
      <div className="safe-bottom shrink-0 px-3 pt-1">
        <nav className="relative mb-2 flex items-center rounded-[26px] border border-border bg-surface/95 px-1.5 py-1 shadow-card backdrop-blur">
          {left.map((t) => (
            <Tab key={t.to} {...t} />
          ))}
          <div className="flex w-16 shrink-0 justify-center">
            <NavLink
              to="/"
              end
              aria-label="Add expense"
              className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-on-brand shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] ring-4 ring-bg transition active:scale-95"
            >
              <Plus size={26} strokeWidth={2.4} />
            </NavLink>
          </div>
          {right.map((t) => (
            <Tab key={t.to} {...t} />
          ))}
        </nav>
      </div>
    </div>
  );
}
