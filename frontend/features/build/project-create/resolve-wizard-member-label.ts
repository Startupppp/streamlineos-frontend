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
export function findWizardMember(
  userId: string | null | undefined,
  members: readonly WizardMember[],
  sessionUser: WizardSessionUser | null | undefined,
): NamedUser | null {
  if (!userId) return null;
  const match = members.find((m) => m.userId === userId);
  if (match) return { name: match.name, email: match.email };
  if (sessionUser?.id === userId && (sessionUser.name || sessionUser.email)) {
    return { name: sessionUser.name, email: sessionUser.email };
  }
  return null;
}

export function resolveWizardMemberLabel(
  userId: string | null | undefined,
  members: readonly WizardMember[],
  sessionUser: WizardSessionUser | null | undefined,
  unsetLabel = "No manager",
): string {
  if (!userId) return unsetLabel;
  const person = findWizardMember(userId, members, sessionUser);
  return person ? getUserDisplayName(person) : "Unknown member";
}
