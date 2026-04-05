import { withAuth, ok, err } from "@/lib/api/helpers";
import { getEmployee } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { invalidateUserSession } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  return withAuth(async (session) => {
    const { employeeId: id } = await params;
    const employee = await getEmployee(session.orgId, id);
    if (!employee) return err("Employee not found.", 404);
    return ok(employee);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  return withAuth(async (session) => {
    const { employeeId: targetUserId } = await params;

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, targetUserId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });

    if (!targetMember) {
      return err("User not found in your organization.", 403);
    }

    const isSelf = session.user.id === targetUserId;
    const isOwnerOrAdmin = isAdminOrOwner(session.user.role);
    if (!isSelf && !isOwnerOrAdmin) {
      return err("You can only update your own profile.", 403);
    }

    const body = await req.json() as {
      name?: string;
      designation?: string;
      departmentId?: number;
      phone?: string;
      image?: string;
      isActive?: boolean;
    };

    if (body.isActive === false) {
      if (!isOwnerOrAdmin) return err("Only admins can terminate employees.", 403);
      if (isSelf) return err("You cannot terminate your own account.", 400);
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.designation !== undefined) updateData.designation = body.designation;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, targetUserId));
    }

    if (body.isActive === false) {
      await invalidateUserSession(targetUserId);
    }

    return ok({ success: true });
  });
}
