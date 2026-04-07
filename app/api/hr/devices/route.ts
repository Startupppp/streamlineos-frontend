import { withAuth, ok, err } from "@/lib/api/helpers";
import { getDevices } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { employeeDevices } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getDevices(session.orgId);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can add devices.", 403);
    }

    const body = await req.json() as {
      userId: string;
      deviceType: string;
      deviceName: string;
      serialNumber?: string;
      brand?: string;
      model?: string;
      notes?: string;
      assignedDate?: string;
    };

    if (!body.userId || !body.deviceType || !body.deviceName) {
      return err("userId, deviceType, and deviceName are required.", 400);
    }

    const [device] = await db
      .insert(employeeDevices)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        deviceType: body.deviceType,
        deviceName: body.deviceName,
        serialNumber: body.serialNumber,
        brand: body.brand,
        model: body.model,
        notes: body.notes,
        assignedDate: body.assignedDate
          ? formatDateOnly(new Date(body.assignedDate))
          : formatDateOnly(new Date()),
        status: "ACTIVE",
      })
      .returning();

    return ok(device);
  });
}
