import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getDevices } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { employeeDevices } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

const postDeviceSchema = z.object({
  userId: z.string(),
  deviceType: z.string(),
  deviceName: z.string(),
  serialNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  notes: z.string().optional(),
  assignedDate: z.string().optional(),
});

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

    const body = await parseBody(req, postDeviceSchema);

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
