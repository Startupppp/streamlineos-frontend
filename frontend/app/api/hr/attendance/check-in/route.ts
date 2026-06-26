import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";

const checkInSchema = z.object({
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: z.string().max(500).optional(),
    })
    .nullish(),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, checkInSchema);
    const today = body.localDate ?? getTodayString();

    try {
      await db.transaction(async (tx) => {
        const result = await tx
          .select()
          .from(attendance)
          .where(
            and(
              eq(attendance.userId, session.user.id),
              eq(attendance.date, today),
              eq(attendance.orgId, session.orgId)
            )
          )
          .orderBy(desc(attendance.createdAt))
          .limit(1)
          .for("update");

        const existing = result[0];

        if (existing) {
          if (!existing.checkOut) {
            throw new Error("Already checked in");
          }

          const lastCheckOut = new Date(existing.checkOut);
          const cooldownDiff = new Date().getTime() - lastCheckOut.getTime();
          const diffMinutes = cooldownDiff / (1000 * 60);
          if (diffMinutes < 2) {
            throw new Error("Please wait 2 minutes before clocking in again.");
          }

          const now = new Date();
          const gapMs = now.getTime() - lastCheckOut.getTime();
          const gapHours = gapMs / (1000 * 60 * 60);

          const currentBreaks =
            (existing.breaks as { start: string; end?: string }[]) || [];
          const newBreaks = [
            ...currentBreaks,
            { start: lastCheckOut.toISOString(), end: now.toISOString() },
          ];
          const newBreakHours =
            (Number(existing.breakHours) || 0) + gapHours;

          await tx
            .update(attendance)
            .set({
              status: "PRESENT",
              checkOut: null,
              breaks: newBreaks,
              breakHours: newBreakHours.toFixed(2),
            })
            .where(eq(attendance.id, existing.id));

          return;
        }

        await tx.insert(attendance).values({
          orgId: session.orgId,
          userId: session.user.id,
          date: today,
          checkIn: new Date(),
          status: "PRESENT",
          locationData: body.location ?? null,
        });
      });

      return ok({ success: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Check-in failed";
      return err(message, 400);
    }
  });
}
