import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getRole } from "@/server/queries/roles";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
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
      if (!isAdminOrOwner(session.user.role)) {
        return err("Only CEO or Admin can update roles", 403);
      }

      const { roleId: id } = await params;
      const roleId = Number(id);
      if (!Number.isFinite(roleId)) return err("Invalid ID", 400);

      const existing = await db.query.roles.findFirst({
        where: and(eq(roles.id, roleId), eq(roles.orgId, session.orgId)),
      });
      if (!existing) return err("Role not found", 404);

      const body = await req.json();
      const input = updateSchema.parse(body);

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name && !existing.isSystem) updateData.name = input.name;
      if (input.permissions) updateData.permissions = input.permissions;

      await db
        .update(roles)
        .set(updateData)
        .where(and(eq(roles.id, roleId), eq(roles.orgId, session.orgId)));

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
      if (!isAdminOrOwner(session.user.role)) {
        return err("Only CEO or Admin can delete roles", 403);
      }

      const { roleId: id } = await params;
      const roleId = Number(id);
      if (!Number.isFinite(roleId)) return err("Invalid ID", 400);

      const existing = await db.query.roles.findFirst({
        where: and(eq(roles.id, roleId), eq(roles.orgId, session.orgId)),
      });
      if (!existing) return err("Role not found", 404);
      if (existing.isSystem) return err("System roles cannot be deleted", 403);

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
