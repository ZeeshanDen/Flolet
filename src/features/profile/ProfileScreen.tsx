import { useEffect, useState } from "react";
import {
  LogOut,
  Check,
  Moon,
  Sun,
  Tags,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useProfile } from "@/features/profile/useProfile";
import { useCategories } from "@/features/categories/useCategories";
import ManageCategoriesSheet from "@/features/categories/ManageCategoriesSheet";
import SetupVaultSheet from "@/features/vault/SetupVaultSheet";
import { useVault } from "@/features/vault/vaultStore";
import { useTheme, type Theme } from "@/lib/theme";
import { CURRENCIES, currencySymbol, cn } from "@/lib/utils";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { profile, currency, update } = useProfile();
  const { categories } = useCategories();
  const { theme, set: setTheme } = useTheme();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const vaultStatus = useVault((s) => s.status);

  useEffect(() => {
    if (profile) setName(profile.displayName);
  }, [profile]);

  const saveName = async () => {
    if (!name.trim()) return;
    await update({ displayName: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const initial = (profile?.displayName || user?.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-xl font-bold">Profile</h1>

      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile?.displayName}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
        </div>
      </div>

      <div className="card mb-3 space-y-3">
        <div>
          <label className="mb-1 block text-sm text-muted">Display name</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button onClick={saveName} className="btn-brand shrink-0 px-4">
              {saved ? <Check size={18} /> : "Save"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">
            Default currency
          </label>
          <select
            className="input"
            value={currency}
            onChange={(e) => update({ defaultCurrency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {currencySymbol(c)} {c}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Used for your personal expenses and insights. Group currency is set
            per group.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-muted">Appearance</label>
          <div className="flex gap-2 rounded-xl bg-surface p-1">
            {(
              [
                { key: "dark", label: "Dark", icon: Moon },
                { key: "light", label: "Light", icon: Sun },
              ] as { key: Theme; label: string; icon: typeof Moon }[]
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition",
                  theme === key
                    ? "bg-brand text-white"
                    : "text-muted",
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setManageOpen(true)}
        className="card mb-3 flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-soft">
          <Tags size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Manage categories</p>
          <p className="text-sm text-muted">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} ·
            add, edit or remove
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-muted" />
      </button>

      <button
        onClick={() => vaultStatus === "none" && setVaultOpen(true)}
        className="card mb-3 flex w-full items-center gap-3 text-left"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            vaultStatus === "unlocked"
              ? "bg-good/15 text-good"
              : "bg-brand/10 text-brand-soft",
          )}
        >
          <ShieldCheck size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">End-to-end encryption</p>
          <p className="text-sm text-muted">
            {vaultStatus === "unlocked"
              ? "On — notes encrypted with your key"
              : "Off — set a passphrase to enable"}
          </p>
        </div>
        {vaultStatus === "none" && (
          <ChevronRight size={18} className="shrink-0 text-muted" />
        )}
      </button>

      <button onClick={logout} className="btn-ghost w-full text-bad">
        <LogOut size={18} />
        Sign out
      </button>

      <ManageCategoriesSheet
        open={manageOpen}
        onClose={() => setManageOpen(false)}
      />
      <SetupVaultSheet open={vaultOpen} onClose={() => setVaultOpen(false)} />
    </div>
  );
}
