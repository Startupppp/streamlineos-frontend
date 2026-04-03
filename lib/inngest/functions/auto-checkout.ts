import { inngest } from "../client";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, isNull, lte } from "drizzle-orm";
import { subHours } from "date-fns";

export const autoCheckout = inngest.createFunction(
  { id: "auto-checkout", name: "Auto Checkout Stale Attendance", triggers: { cron: "0 * * * *" } },
  async ({ step }) => {
    const cutoffTime = subHours(new Date(), 14);

    const staleRecords = await step.run("find-stale-attendance", async () => {
      return db.query.attendance.findMany({
        where: and(
          isNull(attendance.checkOut),
          lte(attendance.checkIn, cutoffTime)
        ),
      });
    });

    if (staleRecords.length === 0) {
      return { checkedOut: 0 };
    }

    const results = await step.run("auto-checkout-records", async () => {
      let count = 0;

      for (const record of staleRecords) {
        if (!record.checkIn) continue;

        const checkInTime = new Date(record.checkIn);
        const endOfDay = new Date(checkInTime);
        endOfDay.setHours(18, 0, 0, 0);

        const autoCheckoutTime = endOfDay > checkInTime ? endOfDay : checkInTime;

        await db
          .update(attendance)
          .set({
            checkOut: autoCheckoutTime,
            autoCheckedOut: true,
          })
          .where(eq(attendance.id, record.id));

        count++;
      }

      return count;
    });

    return { checkedOut: results };
  }
);
