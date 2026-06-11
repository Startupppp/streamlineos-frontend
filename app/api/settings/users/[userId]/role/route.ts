import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ALL_ROLES } from "@/lib/constants/roles";
import { isSuperAdminRole } from "@/lib/rbac/permissions";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAuth(async (session) => {
    if (!isSuperAdminRole(session.user.role)) {
      return err("Only Owner, CEO, or CTO can change user roles", 403);
    }

    const { userId } = await params;

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!member) return err("User not found in this organization", 404);

    const input = await parseBody(req, updateRoleSchema);

    if (!ALL_ROLES.includes(input.role as (typeof ALL_ROLES)[number])) {
      return err(`Invalid role. Valid roles: ${ALL_ROLES.join(", ")}`, 400);
    }

    if (userId === session.user.id && session.user.role !== "OWNER") {
      return err("You cannot change your own role", 403);
    }

    await db
      .update(users)
      .set({ role: input.role })
      .where(eq(users.id, userId));

    await db
      .update(organizationMembers)
      .set({ role: input.role })
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.orgId, session.orgId)
        )
      );

    return ok({ success: true, userId, role: input.role });
  });
}
