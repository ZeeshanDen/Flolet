import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/features/auth/AuthContext";
import type { Group, GroupMember, Invite } from "@/lib/types";
import type { User } from "firebase/auth";

/** Build a member snapshot, omitting undefined fields (Firestore rejects them). */
function memberFromUser(user: User): GroupMember {
  return {
    displayName: user.displayName || user.email?.split("@")[0] || "You",
    email: user.email || "",
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
  };
}

/** Groups the current user belongs to + pending invites addressed to them. */
export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "groups"),
      where("memberUids", "array-contains", user.uid),
    );
    return onSnapshot(q, (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group));
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;
    const q = query(
      collection(db, "invites"),
      where("invitedEmail", "==", user.email),
      where("status", "==", "pending"),
    );
    return onSnapshot(q, (snap) => {
      setInvites(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invite));
    });
  }, [user]);

  const createGroup = async (name: string, currency: string) => {
    if (!user) return null;
    const member = memberFromUser(user);
    const ref = await addDoc(collection(db, "groups"), {
      name,
      currency,
      createdBy: user.uid,
      memberUids: [user.uid],
      members: { [user.uid]: member },
      createdAt: Date.now(),
    });
    return ref.id;
  };

  const inviteToGroup = async (
    groupId: string,
    groupName: string,
    email: string,
  ) => {
    if (!user) return;
    await addDoc(collection(db, "invites"), {
      groupId,
      groupName,
      invitedEmail: email.trim().toLowerCase(),
      invitedByUid: user.uid,
      invitedByName: user.displayName || user.email || "Someone",
      status: "pending",
      createdAt: Date.now(),
    });
  };

  const acceptInvite = async (invite: Invite) => {
    if (!user) return;
    const groupRef = doc(db, "groups", invite.groupId);
    const snap = await getDoc(groupRef);
    if (!snap.exists()) return;
    const member = memberFromUser(user);
    await updateDoc(groupRef, {
      memberUids: arrayUnion(user.uid),
      [`members.${user.uid}`]: member,
    });
    await updateDoc(doc(db, "invites", invite.id), { status: "accepted" });
  };

  return {
    groups,
    invites,
    loading,
    createGroup,
    inviteToGroup,
    acceptInvite,
  };
}
