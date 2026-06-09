/* ─────────────────────────────────────────────────────────────────────────────
   Platform-owner role — meta-role above per-org roles.

   A user with role === PLATFORM_OWNER manages the SaaS itself: every customer
   organization, the payment ledger, contact-form messages, and aggregate
   analytics. They never see org-scoped data through the regular dashboard
   (they're redirected to /owner on sign-in).

   This role is intentionally NOT in SYSTEM_ROLES (lib/rbac/permissions.ts)
   because system roles are org-scoped — platform owners exist outside any
   single org.
   ───────────────────────────────────────────────────────────────────────── */

export const PLATFORM_OWNER_ROLE = "PLATFORM_OWNER" as const;
export type PlatformOwnerRole = typeof PLATFORM_OWNER_ROLE;

export function isPlatformOwner(role: string | null | undefined): boolean {
  return role === PLATFORM_OWNER_ROLE;
}

/** Allow-list of owner-only route prefixes. */
export const OWNER_ROUTE_PREFIX = "/owner";

/** Route that platform owners land on after signing in. */
export const OWNER_HOME = "/owner";
