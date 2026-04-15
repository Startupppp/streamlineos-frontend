"server-only";

import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import type { WorkLog } from "@/types/hr";

export async function getWorkLogs(
  orgId: string,
  userId: string,
  year: number,
  quarter: number,
  filterUserId?: string
): Promise<WorkLog[]> {
  const targetUserId = filterUserId || userId;

  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0);
  const startStr = formatDateOnly(startDate);
  const endStr = formatDateOnly(endDate);

  const logs = await db.query.timesheets.findMany({
    where: and(
      eq(timesheets.orgId, orgId),
      eq(timesheets.userId, targetUserId)
    ),
    with: {
      ticket: {
        columns: { id: true, title: true, ticketNumber: true },
        with: {
          project: { columns: { id: true, name: true, key: true } },
        },
      },
    },
  });

  return logs.filter((l) => l.date >= startStr && l.date <= endStr) as unknown as WorkLog[];
}
