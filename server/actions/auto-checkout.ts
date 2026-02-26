"use server";

import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";

export async function processAutoCheckout() {
  const today = getTodayString();
  const openRecords = await db.query.attendance.findMany({
    where: and(
      eq(attendance.date, today),
      isNull(attendance.checkOut)
    ),
  });

  if (openRecords.length === 0) {
    return { processed: 0, message: "No open attendance records found" };
  }

  let processed = 0;

  for (const record of openRecords) {
    if (!record.checkIn || record.autoCheckedOut) continue;

    const checkInTime = new Date(record.checkIn);
    const checkOutTime = new Date(checkInTime);
    checkOutTime.setHours(19, 0, 0, 0);
    if (checkInTime >= checkOutTime) {
      await db
        .update(attendance)
        .set({
          checkOut: checkOutTime,
          workHours: "0",
          status: "PRESENT",
          autoCheckedOut: true,
          isOvertime: false,
        })
        .where(eq(attendance.id, record.id));
      processed++;
      continue;
    }
    const breaks = (record.breaks as { start: string; end?: string }[]) || [];
    let totalBreakHours = Number(record.breakHours) || 0;

    for (const b of breaks) {
      if (!b.end) {
        b.end = checkOutTime.toISOString();
        const breakStart = new Date(b.start);
        const breakDuration = (checkOutTime.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
        totalBreakHours += breakDuration;
      }
    }
    const durationMs = checkOutTime.getTime() - checkInTime.getTime();
    const workHours = Math.max(0, durationMs / (1000 * 60 * 60) - totalBreakHours);
    const isOvertime = workHours > 8;

    await db
      .update(attendance)
      .set({
        checkOut: checkOutTime,
        workHours: workHours.toFixed(2),
        breakHours: totalBreakHours.toFixed(2),
        breaks: breaks,
        status: "PRESENT",
        autoCheckedOut: true,
        isOvertime,
      })
      .where(eq(attendance.id, record.id));

    processed++;
  }

  return {
    processed,
    message: `Auto-checked out ${processed} attendance records`,
  };
}
