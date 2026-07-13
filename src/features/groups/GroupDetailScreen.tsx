import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, UserPlus, ArrowRight, Trash2, HandCoins } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useGroup } from "@/features/groups/useGroup";
import { useGroups } from "@/features/groups/useGroups";
import { computeBalances, simplifyDebts } from "@/features/split/balances";
import { formatMoney, cn } from "@/lib/utils";

// Local date, not UTC — toISOString() would date a 1am IST payment yesterday.
const today = () => format(new Date(), "yyyy-MM-dd");

function safeDay(iso: string): string {
  const d = parseISO(iso);
  return isNaN(d.getTime()) ? "" : format(d, "d MMM");
}

export default function GroupDetailScreen() {
  const { groupId } = useParams();
  const {
    group,
    expenses,
    settlements,
    loading,
    addSettlement,
    deleteGroupExpense,
  } = useGroup(groupId);
  const { inviteToGroup } = useGroups();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const memberUids = group?.memberUids ?? [];
  const balances = useMemo(
    () => computeBalances(memberUids, expenses, settlements),
    [memberUids, expenses, settlements],
  );
  const debts = useMemo(() => simplifyDebts(balances), [balances]);

  if (!group) {
    return (
      <div className="px-4 pt-6 text-center text-muted">
        {loading ? (
          "Loading group…"
        ) : (
          <>
            <p>This group doesn't exist or you're not a member.</p>
            <Link to="/groups" className="mt-2 inline-block text-brand-soft">
              Back to groups
            </Link>
          </>
        )}
      </div>
    );
  }

  const nameOf = (uid: string) => group.members[uid]?.displayName ?? "Someone";

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    await inviteToGroup(group.id, group.name, inviteEmail);
    setInviteEmail("");
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 1500);
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/groups" aria-label="Back to groups" className="text-muted">
          <ArrowLeft />
        </Link>
        <h1 className="text-xl font-bold">{group.name}</h1>
      </div>

      {/* Balances */}
      <div className="card mb-4">
        <p className="mb-2 text-sm text-muted">Balances</p>
        <div className="space-y-1">
          {balances.map((b) => (
            <div
              key={b.uid}
              className="flex items-center justify-between text-sm"
            >
              <span>{nameOf(b.uid)}</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  b.net > 0 ? "text-good" : b.net < 0 ? "text-bad" : "text-muted",
                )}
              >
                {b.net > 0 ? "gets " : b.net < 0 ? "owes " : ""}
                {formatMoney(Math.abs(b.net), group.currency)}
              </span>
            </div>
          ))}
        </div>

        {debts.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            <p className="mb-1 text-xs text-muted">Suggested settlements</p>
            {debts.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm"
              >
                <span>{nameOf(d.fromUid)}</span>
                <ArrowRight size={14} className="text-muted" />
                <span>{nameOf(d.toUid)}</span>
                <span className="ml-auto font-semibold tabular-nums text-brand-soft">
                  {formatMoney(d.amount, group.currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setSettleOpen((v) => !v)}
          className="btn-ghost mt-3 w-full"
        >
          <HandCoins size={18} />
          Settle up
        </button>

        {settleOpen && (
          <SettleForm
            group={group}
            onSubmit={async (s) => {
              await addSettlement(s);
              setSettleOpen(false);
            }}
          />
        )}
      </div>

      {/* Invite */}
      <div className="card mb-4">
        <p className="mb-2 text-sm text-muted">Invite someone</p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="email"
            placeholder="email@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button
            onClick={sendInvite}
            aria-label="Send invite"
            className="btn-brand shrink-0 px-3"
          >
            <UserPlus size={18} />
          </button>
        </div>
        {inviteSent && (
          <p className="mt-2 text-sm text-good">Invitation sent.</p>
        )}
      </div>

      {/* Expenses */}
      <p className="mb-2 text-sm text-muted">Shared expenses</p>
      {expenses.length === 0 ? (
        <p className="text-center text-muted">
          No shared expenses yet. Add one from the Add tab with Split on.
        </p>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-xl bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.name || "Expense"}</p>
                <p className="text-xs text-muted">
                  {nameOf(e.paidBy)} paid · {safeDay(e.date)}
                </p>
              </div>
              <span className="font-semibold tabular-nums">
                {formatMoney(e.amount, group.currency)}
              </span>
              {confirmDeleteId === e.id ? (
                <span className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      deleteGroupExpense(e.id).catch((err) =>
                        console.error("delete group expense", err),
                      );
                      setConfirmDeleteId(null);
                    }}
                    className="rounded-lg bg-bad px-2 py-1 text-xs font-semibold text-white"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-lg bg-surface px-2 py-1 text-xs font-semibold text-muted"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(e.id)}
                  className="flex h-9 w-9 items-center justify-center text-muted hover:text-bad"
                  aria-label="Delete expense"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettleForm({
  group,
  onSubmit,
}: {
  group: NonNullable<ReturnType<typeof useGroup>["group"]>;
  onSubmit: (s: {
    fromUid: string;
    toUid: string;
    amount: number;
    date: string;
  }) => Promise<void>;
}) {
  const members = group.memberUids;
  const [fromUid, setFromUid] = useState(members[0]);
  const [toUid, setToUid] = useState(members[1] ?? members[0]);
  const [amount, setAmount] = useState("");

  const submit = async () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0 || fromUid === toUid) return;
    await onSubmit({ fromUid, toUid, amount: amt, date: today() });
  };

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        <select
          className="input"
          value={fromUid}
          onChange={(e) => setFromUid(e.target.value)}
        >
          {members.map((uid) => (
            <option key={uid} value={uid}>
              {group.members[uid]?.displayName ?? uid}
            </option>
          ))}
        </select>
        <ArrowRight size={16} className="shrink-0 text-muted" />
        <select
          className="input"
          value={toUid}
          onChange={(e) => setToUid(e.target.value)}
        >
          {members.map((uid) => (
            <option key={uid} value={uid}>
              {group.members[uid]?.displayName ?? uid}
            </option>
          ))}
        </select>
      </div>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        placeholder={`Amount (${group.currency})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={submit} className="btn-brand w-full">
        Record payment
      </button>
    </div>
  );
}
