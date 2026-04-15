"server-only";

import { db } from "@/lib/db";
import { employeeDevices, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Device } from "@/types/hr";

export async function getDevices(orgId: string): Promise<Device[]> {
  const rows = await db
    .select({
      id: employeeDevices.id,
      orgId: employeeDevices.orgId,
      userId: employeeDevices.userId,
      deviceType: employeeDevices.deviceType,
      deviceName: employeeDevices.deviceName,
      serialNumber: employeeDevices.serialNumber,
      brand: employeeDevices.brand,
      model: employeeDevices.model,
      assignedDate: employeeDevices.assignedDate,
      returnDate: employeeDevices.returnDate,
      status: employeeDevices.status,
      notes: employeeDevices.notes,
      createdAt: employeeDevices.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
    })
    .from(employeeDevices)
    .innerJoin(users, eq(employeeDevices.userId, users.id))
    .where(eq(employeeDevices.orgId, orgId))
    .orderBy(desc(employeeDevices.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    userId: r.userId,
    deviceType: r.deviceType,
    deviceName: r.deviceName,
    serialNumber: r.serialNumber,
    brand: r.brand,
    model: r.model,
    assignedDate: r.assignedDate,
    returnDate: r.returnDate,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt,
    user: { id: r.userId, firstName: r.userFirstName, lastName: r.userLastName, email: r.userEmail },
  })) as Device[];
}
