export type InviteAction = "invite" | "resend" | "cancel";

const ACTION_SUBJECT: Record<InviteAction, string> = {
  invite: "invited",
  resend: "resent",
  cancel: "cancelled",
};

export function describeInviteFailure(action: InviteAction, raw: string): string {
  const message = raw.toLowerCase();

  if (message.includes("already a member") || message.includes("already member")) {
    return "This person is already a member of the organization. Manage their access from the People tab instead.";
  }
  if (message.includes("already accepted") || message.includes("accepted")) {
    return "This invitation was already used — the recipient has joined. Nothing to do.";
  }
  if (message.includes("revoked") || message.includes("cancelled") || message.includes("canceled")) {
    return "This invitation was revoked, so it can no longer be used. Send a fresh invitation.";
  }
  if (message.includes("expired")) {
    return "This invitation has expired. Send a fresh invitation to issue a new link.";
  }
  if (message.includes("not found") || message.includes("404")) {
    return `No live invitation exists for this person any more, so it cannot be ${ACTION_SUBJECT[action]}. Send a fresh invitation.`;
  }
  if (message.includes("seat") || message.includes("limit")) {
    return "No seat is available for another member. Free a seat or raise the limit, then invite again.";
  }
  return raw;
}
