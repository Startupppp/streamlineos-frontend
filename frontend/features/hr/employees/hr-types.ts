const PROTECTED_TARGET_ROLES = new Set(["FINAL", "OWNER", "ADMIN"]);

export function canDeleteEmployee(
  targetRole: string,
  targetId: string,
  targetIsActive: boolean,
  currentId: string | undefined,
  canManageEmployees: boolean,
): boolean {
  if (!targetIsActive) return false;
  if (targetId === currentId) return false;
  if (PROTECTED_TARGET_ROLES.has(targetRole)) return false;
  return canManageEmployees;
}


