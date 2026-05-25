import { db } from "@/lib/db";
import { holidays, leaveRequests } from "@/lib/db/schema";
import { and, eq, lte, gte, notInArray } from "drizzle-orm";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import { getPunchDayBlockReason } from "@/lib/hr/punch-day-guard";

/** Returns an error message if work logs must not be created/updated for this date. */
export async function getWorkLogBlockReason(
  orgId: string,
  userId: string,
  dateStr: string,
): Promise<string | null> {
  const today = getTodayString();
  if (dateStr !== today) {
    return "Work logs can only be edited for today.";
  }

  const punchBlock = await getPunchDayBlockReason(orgId, dateStr);
  if (punchBlock) {
    return punchBlock.replace(
      "Regular punch in/out is disabled",
      "Work logs cannot be modified",
    );
  }

  const onLeave = await db.query.leaveRequests.findFirst({
    where: and(
      eq(leaveRequests.orgId, orgId),
      eq(leaveRequests.userId, userId),
      eq(leaveRequests.status, "APPROVED"),
      lte(leaveRequests.startDate, dateStr),
      gte(leaveRequests.endDate, dateStr),
    ),
    columns: { id: true, reason: true },
  });
  if (onLeave) {
    return "You are on approved leave today. Work logs cannot be modified.";
  }

  const holiday = await db.query.holidays.findFirst({
    where: and(eq(holidays.orgId, orgId), eq(holidays.date, dateStr)),
    columns: { name: true },
  });
  if (holiday) {
    return `Work logs cannot be modified on ${holiday.name ?? "a company holiday"}.`;
  }

  return null;
}

