import type { InviteDelivery } from "@/hooks/api/hr/employee-profile-schema";

export const INVITE_NOT_SENT_FALLBACK = "The invitation email could not be queued.";

export function describeUnsentInvite(invite: InviteDelivery): string | null {
  if (invite.sent) return null;
  return `Invitation not sent. ${invite.reason ?? INVITE_NOT_SENT_FALLBACK}`;
}

/**
 * What the server actually did, said plainly.
 *
 * `invite.sent` means the mail reached the outbox — a queue, drained later by a
 * worker, through a provider that may be unconfigured or a domain that may be
 * unverified. The UI reported that as "Invitation sent to <name>", so QA watched
 * two inboxes for three minutes on the strength of a claim the server had never
 * made. Nothing in the product could have told them the difference.
 *
 * Saying "queued" costs nothing when delivery works and is the whole difference
 * when it does not: it points at the copy-link fallback instead of at the inbox.
 */
export function describeQueuedInvite(name: string): string {
  return `Invitation queued for ${name}`;
}

export const INVITE_QUEUED_HINT =
  "It should arrive within a minute or two. If it does not, use Copy invite link and send it yourself.";
