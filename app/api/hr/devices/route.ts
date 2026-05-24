import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getDevices } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { employeeDevices } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { deviceFormSchema } from "@/lib/validations/hr-assets";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const postDeviceSchema = deviceFormSchema.extend({
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

    if (body.serialNumber?.trim()) {
      const dup = await db.query.employeeDevices.findFirst({
        where: and(
          eq(employeeDevices.orgId, session.orgId),
          eq(employeeDevices.serialNumber, body.serialNumber.trim()),
        ),
      });
      if (dup) {
        return err("A device with this serial number already exists.", 409);
      }
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
