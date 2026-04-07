import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { employeeDevices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can update devices.", 403);
    }

    const { deviceId: id } = await params;
    const deviceId = Number(id);
    if (!deviceId) return err("Invalid device ID.", 400);

    const body = await req.json() as {
      userId?: string;
      deviceType?: string;
      deviceName?: string;
      serialNumber?: string;
      brand?: string;
      model?: string;
      notes?: string;
      status?: "ACTIVE" | "INACTIVE" | "LOST" | "RETURNED";
      returnDate?: string;
    };

    const existing = await db.query.employeeDevices.findFirst({
      where: and(eq(employeeDevices.id, deviceId), eq(employeeDevices.orgId, session.orgId)),
    });

    if (!existing) return err("Device not found.", 404);

    await db
      .update(employeeDevices)
      .set({
        ...(body.userId !== undefined && { userId: body.userId }),
        ...(body.deviceType !== undefined && { deviceType: body.deviceType }),
        ...(body.deviceName !== undefined && { deviceName: body.deviceName }),
        ...(body.serialNumber !== undefined && { serialNumber: body.serialNumber }),
        ...(body.brand !== undefined && { brand: body.brand }),
        ...(body.model !== undefined && { model: body.model }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.returnDate !== undefined && { returnDate: formatDateOnly(new Date(body.returnDate)) }),
      })
      .where(eq(employeeDevices.id, deviceId));

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can delete devices.", 403);
    }

    const { deviceId: id } = await params;
    const deviceId = Number(id);
    if (!deviceId) return err("Invalid device ID.", 400);

    const existing = await db.query.employeeDevices.findFirst({
      where: and(eq(employeeDevices.id, deviceId), eq(employeeDevices.orgId, session.orgId)),
    });

    if (!existing) return err("Device not found.", 404);

    await db.delete(employeeDevices).where(eq(employeeDevices.id, deviceId));
    return ok({ success: true });
  });
}
