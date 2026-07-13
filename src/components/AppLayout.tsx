import { Outlet, NavLink } from "react-router-dom";
import { Plus, ListOrdered, PieChart, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Add", icon: Plus, end: true },
  { to: "/history", label: "History", icon: ListOrdered, end: false },
  { to: "/insights", label: "Insights", icon: PieChart, end: false },
  { to: "/groups", label: "Groups", icon: Users, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
];

export default function AppLayout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="safe-top flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md items-stretch justify-around border-t border-border bg-surface/95 backdrop-blur">
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
