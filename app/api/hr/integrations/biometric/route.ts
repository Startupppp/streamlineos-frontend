import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const biometricSchema = z.object({
  employeeId: z.string().min(1),
  timestamp: z.string().min(1),
  type: z.enum(["CHECK_IN", "CHECK_OUT"]),
  deviceId: z.string().optional(),
  apiKey: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = biometricSchema.parse(await req.json());

  const expectedKey = process.env.BIOMETRIC_API_KEY;
  if (!expectedKey || body.apiKey !== expectedKey) {
    return err("Invalid API key.", 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.employeeId, body.employeeId),
  });

  if (!user) return err(`Employee not found: ${body.employeeId}`, 404);

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, user.id),
  });

  if (!member) return err("Employee not in any organization.", 404);

  const timestamp = new Date(body.timestamp);
  const dateStr = timestamp.toISOString().split("T")[0];

  if (body.type === "CHECK_IN") {
    const [log] = await db.insert(attendance).values({
      orgId: member.orgId,
      userId: user.id,
      date: dateStr,
      checkIn: timestamp,
      status: "PRESENT",
    }).returning();
    return ok({ logged: true, type: "CHECK_IN", logId: log.id });
  }

  const existingLog = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.userId, user.id),
      eq(attendance.date, dateStr)
    ),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  if (!existingLog) {
    return err("No check-in found for today.", 400);
  }

  const checkInTime = existingLog.checkIn ? new Date(existingLog.checkIn) : timestamp;
  const workHours = (timestamp.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

  await db.update(attendance).set({
    checkOut: timestamp,
    workHours: workHours.toFixed(2),
    status: "CHECKED_OUT",
  }).where(eq(attendance.id, existingLog.id));

  return ok({ logged: true, type: "CHECK_OUT", workHours: workHours.toFixed(2) });
}
