import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { memberId: userId } = await params;

      const ability = await getSessionAbility();
      if (!ability.can("manage", "all")) {
        return err("Only organization owners can update member roles", 403);
      }

      const body = await req.json();
      const { role } = updateRoleSchema.parse(body);

      await db
        .update(organizationMembers)
        .set({ role })
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.orgId, session.orgId)
          )
        );

      await db
        .update(users)
        .set({ role })
        .where(eq(users.id, userId));

      await createAuditLog({
        action: "org.member_role_changed",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: userId,
        targetType: "user",
        metadata: { newRole: role },
      });

      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update member role",
        500
      );
    }
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { memberId: userId } = await params;

      if (userId === session.user.id) {
        return err("You cannot remove yourself from the organization", 400);
      }

      const ability = await getSessionAbility();
      if (!ability.can("manage", "settings")) {
        return err("Forbidden", 403);
      }

      await db
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.orgId, session.orgId)
          )
        );

      await createAuditLog({
        action: "org.member_removed",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: userId,
        targetType: "user",
      });

      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to remove member",
        500
      );
    }
  });
}
