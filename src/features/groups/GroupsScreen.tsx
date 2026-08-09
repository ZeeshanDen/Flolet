import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, Mail, Check, ArrowLeft } from "lucide-react";
import { useGroups } from "@/features/groups/useGroups";
import { CURRENCIES, currencySymbol } from "@/lib/utils";

export default function GroupsScreen() {
  const { groups, invites, loading, createGroup, acceptInvite } = useGroups();
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
          <h1 className="text-xl font-bold">Groups</h1>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="btn-brand px-3 py-2"
        >
          <Plus size={18} />
          New
        </button>
      </div>

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
    </div>
  );
}
