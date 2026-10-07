import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import type { WizardMember } from "./use-wizard-members";

export type WizardSessionUser = NamedUser & { id?: string };

/**
 * Resolve a wizard Manager/Team id to a display label.
 *
 * Draft defaults seed managerId/memberIds with session.user.id. The directory
 * (org or build members) can miss that id — empty build roster, pending org
 * list, id shape miss — which previously rendered "Unknown member" while
 * Basics showed "No manager" for the same unset-looking control.
 */
export function resolveWizardMemberLabel(
  userId: string | null | undefined,
  members: readonly WizardMember[],
  sessionUser: WizardSessionUser | null | undefined,
  unsetLabel = "No manager",
): string {
  if (!userId) return unsetLabel;
  const match = members.find((m) => m.userId === userId);
  if (match) {
    return getUserDisplayName({ name: match.name, email: match.email });
  }
  if (sessionUser?.id && sessionUser.id === userId) {
    return getUserDisplayName({
      name: sessionUser.name,
      email: sessionUser.email,
    });
  }
  return "Unknown member";
}
