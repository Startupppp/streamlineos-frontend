import { inviteEmailSchema } from "@/features/directory/users/user-invite-schema";
import type { Invitee } from "./wizard-data-schema";

export type InviteEmailResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * Validates one address before it joins the invite list.
 *
 * The backend's bulk-invite endpoint parses `z.array(inviteEmailSchema)`, so a
 * single malformed address rejects the *whole* request — every invitee sharing
 * that role fails with it. Catching it here keeps one typo from taking the
 * batch down.
 */
export function validateInviteEmail(
  value: string,
  existing: readonly Invitee[],
): InviteEmailResult {
  const parsed = inviteEmailSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address",
    };
  }

  const email = parsed.data;
  if (existing.some((invitee) => invitee.email.toLowerCase() === email)) {
    return { ok: false, error: "That address is already on the invite list." };
  }

  return { ok: true, email };
}
