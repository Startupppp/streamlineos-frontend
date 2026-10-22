import { inviteEmailSchema } from "@/lib/validation/user-invite";
import type { Invitee } from "./wizard-data-schema";

export type InviteEmailResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

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
