"use server";

import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { AuthResult } from "@/lib/auth-types";

export function isAdminOrOwner(role: string | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export async function getAuthenticatedMember(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) {
    return { error: "Not a member" };
  }

  return {
    session,
    member,
    isAdmin: member.role === "OWNER" || member.role === "ADMIN",
    userId: session.user.id,
    orgId: member.orgId,
  };
}
