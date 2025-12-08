"use server";

import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and, desc } from "drizzle-orm";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";

export type AttendanceStatus = "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT";

export async function getAttendanceStatus(): Promise<{
  status: AttendanceStatus;
  logs: any;
  todayLog: any;
}> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  const today = format(new Date(), "yyyy-MM-dd");

  const todayLog = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today), eq(attendance.orgId, orgId)),
  });

  const logs = await db.query.attendance.findMany({
    where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
    orderBy: [desc(attendance.date)],
    limit: 10,
  });

  let status: AttendanceStatus = "OFFLINE";

  if (todayLog) {
    if (todayLog.checkOut) {
      status = "CHECKED_OUT";
    } else if (todayLog.status === "ON_BREAK") {
      status = "ON_BREAK";
    } else {
      status = "PRESENT";
    }
  }

  return { status, logs, todayLog };
}

export async function checkIn(locationData: any) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  const today = format(new Date(), "yyyy-MM-dd");

  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today), eq(attendance.orgId, orgId)),
  });

  if (existing) throw new Error("Already checked in for today");

  await db.insert(attendance).values({
    orgId,
    userId,
    date: today,
    checkIn: new Date(),
    status: "PRESENT",
    locationData,
  });

  revalidatePath("/hr/attendance");
}

export async function checkOut() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");
  
  const today = format(new Date(), "yyyy-MM-dd");

  const log = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today), eq(attendance.orgId, orgId)),
  });

  if (!log || log.checkOut) throw new Error("Cannot check out");

  const now = new Date();
  
  // Calculate total work hours
  // Work Hours = (Now - CheckIn) - BreakHours
  const checkInTime = new Date(log.checkIn!);
  const durationMs = now.getTime() - checkInTime.getTime();
  const workHours = (durationMs / (1000 * 60 * 60)) - (Number(log.breakHours) || 0);

  // Check overtime (assuming 9 hours shift)
  const isOvertime = workHours > 9;

  await db.update(attendance)
    .set({
      checkOut: now,
      status: "PRESENT", // Done for day
      workHours: workHours.toFixed(2),
      isOvertime,
    })
    .where(eq(attendance.id, log.id));

  revalidatePath("/hr/attendance");
}

export async function toggleBreak() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  const today = format(new Date(), "yyyy-MM-dd");
  const log = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today), eq(attendance.orgId, orgId)),
  });

  if (!log || log.checkOut) throw new Error("Invalid action");

  const now = new Date();
  const breaks = (log.breaks as { start: string; end?: string }[]) || [];

  if (log.status === "PRESENT") {
    // Start Break
    await db.update(attendance).set({
      status: "ON_BREAK",
      breaks: [...breaks, { start: now.toISOString() }],
    }).where(eq(attendance.id, log.id));
  } else {
    // End Break
    const lastBreak = breaks[breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = now.toISOString();
      
      // Calculate duration
      const start = new Date(lastBreak.start);
      const durationHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
      const totalBreak = (Number(log.breakHours) || 0) + durationHours;

      await db.update(attendance).set({
        status: "PRESENT",
        breaks: breaks, // updated with end time
        breakHours: totalBreak.toFixed(2),
      }).where(eq(attendance.id, log.id));
    }
  }

  revalidatePath("/hr/attendance");
}
