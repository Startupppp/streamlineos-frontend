import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getRole } from "@/server/queries/roles";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isSuperAdminRole } from "@/lib/rbac/permissions";
import { invalidateCache, CACHE_KEYS } from "@/lib/cache";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { roleId: id } = await params;
      const roleId = Number(id);
      if (!Number.isFinite(roleId)) return err("Invalid ID", 400);

      const role = await getRole(session.orgId, roleId);
      if (!role) return err("Role not found", 404);
      return ok(role);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load role",
        500
      );
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  return withAuth(async (session) => {
    try {
      if (!isSuperAdminRole(session.user.role)) {
        return err("Only Owner, CEO, or CTO can update roles", 403);
      }

      const { roleId: id } = await params;
      const roleId = Number(id);
      if (!Number.isFinite(roleId)) return err("Invalid ID", 400);

      const existing = await db.query.roles.findFirst({
        where: and(eq(roles.id, roleId), eq(roles.orgId, session.orgId)),
      });
      if (!existing) return err("Role not found", 404);

      const input = await parseBody(req, updateSchema);

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name && !existing.isSystem) updateData.name = input.name;
      if (input.permissions) updateData.permissions = input.permissions;

      await db
        .update(roles)
        .set(updateData)
        .where(and(eq(roles.id, roleId), eq(roles.orgId, session.orgId)));

      await invalidateCache(CACHE_KEYS.rolesList(session.orgId));

      void createAuditLog({
        action: "role.changed",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(roleId),
        targetType: "role",
        metadata: { name: input.name, permissionsUpdated: !!input.permissions },
      }).catch(() => {});

      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update role",
        500
      );
    }
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  return withAuth(async (session) => {
    try {
      if (!isSuperAdminRole(session.user.role)) {
        return err("Only Owner, CEO, or CTO can delete roles", 403);
      }

      const { roleId: id } = await params;
      const roleId = Number(id);
      if (!Number.isFinite(roleId)) return err("Invalid ID", 400);

      const existing = await db.query.roles.findFirst({
        where: and(eq(roles.id, roleId), eq(roles.orgId, session.orgId)),
      });
      if (!existing) return err("Role not found", 404);
      if (existing.isSystem) return err("System roles cannot be deleted", 403);

      const { users: usersTable, organizationMembers } = await import("@/lib/db/schema");
      const { count } = await import("drizzle-orm");
      const [{ value: userCount }] = await db
        .select({ value: count() })
        .from(organizationMembers)
        .innerJoin(usersTable, eq(organizationMembers.userId, usersTable.id))
        .where(
          and(
            eq(organizationMembers.orgId, session.orgId),
            eq(usersTable.role, existing.slug)
          )
        );

      if (Number(userCount) > 0) {
        return err(
          `Cannot delete role — ${userCount} user${Number(userCount) !== 1 ? "s are" : " is"} assigned to it. Reassign them first.`,
          409
        );
      }

      await db
        .delete(roles)
        .where(and(eq(roles.id, roleId), eq(roles.orgId, session.orgId)));

      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to delete role",
        500
      );
    }
  });
}
