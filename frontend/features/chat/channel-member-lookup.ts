import type { ChannelMember } from "@/types/chat";

/**
 * The two member lookups every chat surface needs, written once.
 *
 * Four surfaces resolved a DIRECT channel's other party with their own copy of
 * `members.find((m) => m.user?.id !== currentUserId)?.user`. That predicate is only safe once
 * `member.user` is actually populated — until 2026-09-03 the API nested it under `membership`, so
 * `m.user?.id` was `undefined`, `undefined !== currentUserId` was true for the FIRST member, and
 * every DIRECT header read "Unknown".
 *
 * Two cases survive the flattening and are why this is a function rather than four copies of a
 * one-liner: a member whose user row is gone arrives as `user: null` and would win the `!==` race
 * ahead of the real partner, and a self-DM has exactly one member — the caller — so "the one that
 * is not me" is nobody.
 */
export function resolveDirectPartner(
  members: ChannelMember[] | undefined,
  currentUserId: string,
): ChannelMember["user"] {
  if (!members || members.length === 0) return null;
  const partner = members.find((member) => member.user && member.user.id !== currentUserId);
  if (partner) return partner.user;
  const [only] = members;
  return members.length === 1 && only?.user?.id === currentUserId ? only.user : null;
}

/** The caller's own row: it carries `isFavorite`, `role`, `lastReadAt` and the mute state. */
export function findOwnMember(
  members: ChannelMember[] | undefined,
  currentUserId: string,
): ChannelMember | undefined {
  return members?.find((member) => member.user?.id === currentUserId);
}
