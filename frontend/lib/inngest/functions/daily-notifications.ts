import { inngest } from "../client";
import { db } from "@/lib/db";
import { leaveRequests, holidays, users } from "@/lib/db/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { addDays, startOfDay, endOfDay, format } from "date-fns";

export const dailyNotifications = inngest.createFunction(
  { id: "daily-notifications", name: "Daily Notifications", triggers: { cron: "0 8 * * *" } },
  async ({ step }) => {
    const today = new Date();
    const tomorrow = addDays(today, 1);

    const upcomingHolidays = await step.run("check-upcoming-holidays", async () => {
      const todayStr = format(startOfDay(today), "yyyy-MM-dd");
      const tomorrowStr = format(endOfDay(tomorrow), "yyyy-MM-dd");

      return db.query.holidays.findMany({
        where: and(
          gte(holidays.date, todayStr),
          lte(holidays.date, tomorrowStr)
        ),
      });
    });

    if (upcomingHolidays.length > 0) {
      await step.run("notify-holiday", async () => {
        const allUsers = await db.query.users.findMany({
          where: eq(users.isActive, true),
          columns: { id: true, email: true, name: true },
        });

        for (const holiday of upcomingHolidays) {
          const isToday = startOfDay(new Date(holiday.date)).getTime() === startOfDay(today).getTime();

          for (const user of allUsers) {
            await inngest.send({
              name: "notification/send",
              data: {
                userId: user.id,
                type: "holiday_reminder",
                title: isToday ? "Holiday Today!" : "Holiday Tomorrow",
                message: `${holiday.name} on ${format(new Date(holiday.date), "MMMM d, yyyy")}`,
                channels: ["in_app", "push"],
              },
            });
          }
        }

        return { notified: allUsers.length, holidays: upcomingHolidays.length };
      });
    }

    const pendingLeaves = await step.run("check-pending-leave-approvals", async () => {
      return db.query.leaveRequests.findMany({
        where: eq(leaveRequests.status, "PENDING"),
        with: {
          user: { columns: { name: true, email: true } },
        },
      });
    });

    if (pendingLeaves.length > 0) {
      await step.run("notify-pending-approvals", async () => {
        const approverIds = [...new Set(pendingLeaves.map((l) => l.approverId).filter(Boolean))] as string[];

        for (const approverId of approverIds) {
          const count = pendingLeaves.filter((l) => l.approverId === approverId).length;

          await inngest.send({
            name: "notification/send",
            data: {
              userId: approverId,
              type: "pending_leave_approval",
              title: "Pending Leave Approvals",
              message: `You have ${count} leave request(s) awaiting your approval`,
              link: "/hr/leaves",
              channels: ["in_app", "email"],
            },
          });
        }

        return { approversNotified: approverIds.length };
      });
    }

    return {
      holidaysNotified: upcomingHolidays.length,
      pendingLeaves: pendingLeaves.length,
    };
  }
);
