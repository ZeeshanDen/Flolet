import { Outlet, NavLink } from "react-router-dom";
import { Plus, ListOrdered, PieChart, Pill, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Add", icon: Plus, end: true },
  { to: "/history", label: "History", icon: ListOrdered, end: false },
  { to: "/insights", label: "Insights", icon: PieChart, end: false },
  { to: "/meds", label: "Meds", icon: Pill, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
];

export default function AppLayout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="safe-top min-h-0 flex-1 overflow-y-auto pb-4">
        <Outlet />
      </main>

      {/* In-flow, NOT position:fixed — fixed anchors to iOS's (wrong-at-launch)
          layout viewport; as the shell's last flex child it sits at the true
          bottom of the --app-h-sized body. */}
      <nav className="safe-bottom z-10 flex shrink-0 items-stretch justify-around border-t border-border bg-surface/95 backdrop-blur">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition",
                isActive ? "text-brand-soft" : "text-muted",
              )
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
