import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useGroups } from "@/features/groups/useGroups";
import { useAllActivity } from "@/features/groups/useAllActivity";
import { buildFriends } from "@/features/groups/friends";
import { deleteSettlementDoc } from "@/features/groups/useGroup";
import ActivityList, {
  sortActivity,
  type ActivityItem,
} from "@/features/groups/ActivityList";
import GroupExpenseSheet from "@/features/groups/GroupExpenseSheet";
import { involvesPair } from "@/features/split/balances";
import { formatMoney, cn } from "@/lib/utils";
import type { Group, GroupExpense } from "@/lib/types";

/** Everything you and one person share, across all groups. */
export default function FriendDetailScreen() {
  const { uid: friendUid = "" } = useParams();
  const { user } = useAuth();
  const me = user?.uid ?? "";
  const { groups, loading } = useGroups();
  const { expenses, settlements } = useAllActivity(groups);
  const [editing, setEditing] = useState<{
    group: Group;
    e: GroupExpense;
  } | null>(null);

  const friend = useMemo(
    () =>
      buildFriends(me, groups, expenses, settlements).find(
        (f) => f.uid === friendUid,
      ),
    [me, groups, expenses, settlements, friendUid],
  );

  const items = useMemo(() => {
    const out: ActivityItem[] = [];
    for (const g of groups) {
      if (!g.memberUids.includes(friendUid)) continue;
      for (const e of expenses[g.id] ?? [])
        if (involvesPair(me, friendUid, e))
          out.push({ kind: "expense", group: g, e });
      for (const s of settlements[g.id] ?? [])
        if (
          (s.fromUid === me && s.toUid === friendUid) ||
          (s.fromUid === friendUid && s.toUid === me)
        )
          out.push({ kind: "settlement", group: g, s });
    }
    return sortActivity(out);
  }, [groups, expenses, settlements, me, friendUid]);

  if (!friend)
    return (
      <div className="px-4 pt-6 text-center text-muted">
        {loading ? "Loading…" : "Not found in your groups."}
        <div>
          <Link to="/groups" className="mt-2 inline-block text-brand-soft">
            Back
          </Link>
        </div>
      </div>
    );

  const balances = Object.entries(friend.netByCurrency).filter(
    ([, v]) => Math.abs(v) >= 0.01,
  );

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/groups?tab=friends" aria-label="Back" className="text-muted">
          <ArrowLeft />
        </Link>
        <h1 className="truncate text-xl font-bold">{friend.name}</h1>
      </div>

      <div className="card mb-4 text-center">
        {balances.length === 0 ? (
          <p className="font-semibold text-muted">You're all settled up</p>
        ) : (
          balances.map(([cur, v]) => (
            <p
              key={cur}
              className={cn(
                "text-lg font-bold",
                v > 0 ? "text-good" : "text-[#f97316]",
              )}
            >
              {v > 0
                ? `${friend.name} owes you ${formatMoney(v, cur)}`
                : `You owe ${friend.name} ${formatMoney(-v, cur)}`}
            </p>
          ))
        )}
        <p className="mt-1 text-xs text-muted">
          Across {friend.groupIds.length} shared group
          {friend.groupIds.length === 1 ? "" : "s"} · settle up inside a group
        </p>
      </div>

      <p className="mb-2 text-sm text-muted">Shared history</p>
      <ActivityList
        me={me}
        items={items}
        showGroup
        onEdit={(group, e) => setEditing({ group, e })}
        onDeleteSettlement={(g, s) =>
          deleteSettlementDoc(g.id, s.id).catch((err) =>
            console.error("delete settlement", err),
          )
        }
      />

      {editing && (
        <GroupExpenseSheet
          group={editing.group}
          expense={editing.e}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
