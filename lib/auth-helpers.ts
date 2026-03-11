// Pure utility - no "use server" directive needed since this is imported by tRPC routers
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { AuthResult } from "@/lib/auth-types";

// Roles with full admin privileges
const ADMIN_ROLES = ["CEO", "ADMIN"];

export function isAdminOrOwner(role: string | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function isCEO(role: string | undefined | null): boolean {
  return role === "CEO";
}

/**
 * Single-org auto-membership: ensures the user belongs to the one organization.
 * If they don't have a membership row, creates one automatically.
 * Returns the orgId + role, or null if no organization exists at all.
 */
export async function ensureOrgMembership(
  userId: string,
  role?: string
): Promise<{ orgId: string; role: string } | null> {
  // Check if membership already exists
  const existing = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, userId),
  });

  if (existing) {
    return { orgId: existing.orgId, role: existing.role };
  }

  // No membership — find the single org and auto-add
  const org = await db.query.organizations.findFirst();
  if (!org) return null;

  const memberRole = role || "MEMBER";

  try {
    await db
      .insert(organizationMembers)
      .values({
        userId,
        orgId: org.id,
        role: memberRole,
      })
      .onConflictDoNothing();
  } catch {
    // FK or other constraint error — user may not exist yet
    return null;
  }

  return { orgId: org.id, role: memberRole };
}

export async function getAuthenticatedMember(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Auto-add to org if not a member
  const membership = await ensureOrgMembership(
    session.user.id,
    session.user.role
  );

  if (!membership) {
    return { error: "Unauthorized" };
  }

  // Fetch the full member row for backward compatibility
  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) {
    return { error: "Unauthorized" };
  }

  return {
    session,
    member,
    isAdmin: ADMIN_ROLES.includes(member.role),
    userId: session.user.id,
    orgId: member.orgId,
  };
}
