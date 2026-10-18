import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Users,
  Mail,
  Check,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useGroups } from "@/features/groups/useGroups";
import { useAllActivity } from "@/features/groups/useAllActivity";
import { buildFriends } from "@/features/groups/friends";
import { CURRENCIES, currencySymbol, formatMoney, cn } from "@/lib/utils";

function FriendsList() {
  const { user } = useAuth();
  const { groups, loading } = useGroups();
  const { expenses, settlements } = useAllActivity(groups);
  const friends = useMemo(
    () => buildFriends(user?.uid ?? "", groups, expenses, settlements),
    [user?.uid, groups, expenses, settlements],
  );

  if (loading)
    return <p className="mt-10 text-center text-muted">Loading…</p>;
  if (friends.length === 0)
    return (
      <p className="mt-10 text-center text-muted">
        No friends yet — invite someone to a group and they'll show up here.
      </p>
    );

  return (
    <div className="space-y-2">
      {friends.map((f) => {
        const owing = Object.entries(f.netByCurrency).filter(
          ([, v]) => Math.abs(v) >= 0.01,
        );
        return (
          <Link
            key={f.uid}
            to={`/friends/${f.uid}`}
            className="flex items-center gap-3 rounded-xl bg-card px-3 py-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-white">
              {f.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{f.name}</p>
              {owing.length === 0 ? (
                <p className="text-xs text-muted">settled up</p>
              ) : (
                owing.map(([cur, v]) => (
                  <p
                    key={cur}
                    className={cn(
                      "text-xs font-semibold",
                      v > 0 ? "text-good" : "text-[#f97316]",
                    )}
                  >
                    {v > 0
                      ? `owes you ${formatMoney(v, cur)}`
                      : `you owe ${formatMoney(-v, cur)}`}
                  </p>
                ))
              )}
            </div>
            <ChevronRight size={16} className="shrink-0 text-muted" />
          </Link>
        );
      })}
    </div>
  );
}

export default function GroupsScreen() {
  const { groups, invites, loading, createGroup, acceptInvite } = useGroups();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "friends" ? "friends" : "groups";
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    try {
      await createGroup(name.trim(), currency);
      setName("");
      setCreating(false);
    } catch (e) {
      console.error("create group", e);
      setError("Couldn't create the group — try again.");
    }
  };

  const join = async (inv: Parameters<typeof acceptInvite>[0]) => {
    try {
      await acceptInvite(inv);
    } catch (e) {
      console.error("accept invite", e);
      setError("Couldn't join the group — try again.");
    }
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/profile" aria-label="Back to profile" className="text-muted">
            <ArrowLeft />
          </Link>
          <h1 className="text-xl font-bold">Splits</h1>
        </div>
        {tab === "groups" && (
          <button
            onClick={() => setCreating((v) => !v)}
            className="btn-brand px-3 py-2"
          >
            <Plus size={18} />
            New
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2 rounded-xl bg-surface p-1">
        {(["groups", "friends"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setParams(t === "friends" ? { tab: t } : {})}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium capitalize transition",
              tab === t ? "bg-brand text-white" : "text-muted",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "friends" && <FriendsList />}

      {tab === "groups" && (
      <>
      {creating && (
        <div className="card mb-4 space-y-3">
          <input
            className="input"
            placeholder="Group name (e.g. Flatmates)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {currencySymbol(c)} {c}
              </option>
            ))}
          </select>
          <button onClick={submit} className="btn-brand w-full">
            Create group
          </button>
        </div>
      )}

      {invites.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-muted">Invitations</p>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-xl bg-card px-3 py-2"
              >
                <Mail size={18} className="text-brand-soft" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{inv.groupName}</p>
                  <p className="text-xs text-muted">
                    from {inv.invitedByName}
                  </p>
                </div>
                <button onClick={() => join(inv)} className="btn-brand px-3 py-2">
                  <Check size={16} />
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-bad">{error}</p>}

      {loading ? (
        <p className="mt-10 text-center text-muted">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="mt-10 text-center text-muted">
          No groups yet. Create one to split expenses.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="flex items-center gap-3 rounded-xl bg-card px-3 py-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-brand-soft">
                <Users size={20} />
              </span>
              <div className="flex-1">
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-muted">
                  {g.memberUids.length} member
                  {g.memberUids.length > 1 ? "s" : ""} · {g.currency}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
