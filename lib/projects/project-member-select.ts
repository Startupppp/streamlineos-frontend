/**
 * GET /api/projects/:projectId/members returns flat user rows (`id` = user id).
 * Some UIs use nested {@link import("@/types/projects").ProjectMember} with `userId` + `user`.
 */

export type ProjectMemberSelectRow = {
  /** User id from GET /projects/:id/members (`users.id`). */
  id: string | number;
  userId?: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  /** Project role from GET /projects/:id/members when present. */
  role?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
};

export function projectMemberUserId(m: ProjectMemberSelectRow): string {
  return String(m.userId ?? m.id);
}

export function projectMemberLabel(m: ProjectMemberSelectRow): string {
  if (m.user?.name?.trim()) return m.user.name.trim();
  if (m.name?.trim()) return m.name.trim();
  const composed = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  if (composed) return composed;
  if (m.user?.email?.trim()) return m.user.email.trim();
  if (m.email?.trim()) return m.email.trim();
  return "Member";
}
