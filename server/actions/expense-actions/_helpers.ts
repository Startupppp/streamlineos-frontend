"use server";

import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ensureOrgMembership } from "@/lib/auth/helpers";

export async function getExpenseMember() {
  const session = await auth();
  if (!session?.user?.id) return null;
  await ensureOrgMembership(session.user.id, session.user.role);
  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return null;
  return { session, member };
}
