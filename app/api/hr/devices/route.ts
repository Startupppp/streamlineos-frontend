import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getDevices } from "@/server/queries/hr";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { employeeDevices } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";

const postDeviceSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  deviceType: z.string().min(1, "Device type is required"),
  deviceName: z
    .string()
    .min(1, "Device name is required")
    .max(100)
    .refine((v) => /[a-zA-Z]/.test(v), "Device name must contain at least one letter"),
  serialNumber: z.string().min(1, "Serial number is required").max(100),
  brand: z.string().min(1, "Brand is required").max(100),
  model: z.string().min(1, "Model is required").max(100),
  notes: z.string().max(500).optional(),
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
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:assets")) {
      return err("Only admins can add devices.", 403);
    }

    const body = await parseBody(req, postDeviceSchema);

    const existing = await db.query.employeeDevices.findFirst({
      where: and(
        eq(employeeDevices.orgId, session.orgId),
        sql`lower(trim(${employeeDevices.serialNumber})) = ${body.serialNumber.trim().toLowerCase()}`,
      ),
      columns: { id: true },
    });

    if (existing) {
      return err("A device with this serial number already exists.", 409);
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
