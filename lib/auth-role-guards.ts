/**
 * Pure role checks — safe to import from Client Components.
 * Do not import `@/lib/auth-helpers` from the browser: it pulls `next-auth` config → `lib/email` → SendGrid (`fs`).
 */
import { ADMIN_ROLES, EXPENSE_ADMIN_ROLES, ROLES } from "@/lib/constants/roles";

export function isAdminOrOwner(role: string | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function isCEO(role: string | undefined | null): boolean {
  return role === ROLES.CEO;
}

export function isExpenseAdmin(role: string | undefined | null): boolean {
  return !!role && EXPENSE_ADMIN_ROLES.includes(role);
}
