import type { InviteDelivery } from "@/hooks/api/hr/employee-profile-schema";

export const INVITE_NOT_SENT_FALLBACK = "The invitation email could not be queued.";

export function describeUnsentInvite(invite: InviteDelivery): string | null {
  if (invite.sent) return null;
  return `Invitation not sent. ${invite.reason ?? INVITE_NOT_SENT_FALLBACK}`;
}

export function describeQueuedInvite(name: string): string {
  return `Invitation queued for ${name}`;
}

export const INVITE_QUEUED_HINT =
  "It should arrive within a minute or two. If it does not, use Copy invite link and send it yourself.";
