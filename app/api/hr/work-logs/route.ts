import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getWorkLogs } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema/projects";
import { eq, and, sql } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

const postWorkLogSchema = z.object({
  date: z.string(),
  hours: z.number().optional(),
  description: z.string().optional(),
  workLink: z.string().url().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const ability = await getSessionAbility();

    const isAdmin = ability.can("manage", "hr:attendance");
    const filterUserId = searchParams.get("userId") ?? undefined;
    const year = searchParams.get("year");
    const quarter = searchParams.get("quarter");
    const monthParam = searchParams.get("month");
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' work logs.", 403);
    }

    if (!year || !quarter) {
      return err("year and quarter query params are required.", 400);
    }

    const month = monthParam !== null ? Number(monthParam) : undefined;

    const data = await getWorkLogs(
      session.orgId,
      session.user.id,
      Number(year),
      Number(quarter),
      filterUserId,
      month,
      dateFrom,
      dateTo
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, postWorkLogSchema);

    const dateStr = formatDateOnly(body.date);
    const todayStr = getTodayString();
    if (dateStr !== todayStr) {
      return err("Work logs can only be created or updated for today.", 403);
    }
    const normalizedDescription = body.description
      ? body.description.replace(
          /(^\s*\w|[.!?]\s+\w)/g,
          (c) => c.toUpperCase()
        )
      : body.description;

    const workLink = body.workLink || null;

    const [upserted] = await db
      .insert(timesheets)
      .values({
        orgId: session.orgId,
        userId: session.user.id,
        date: dateStr,
        description: normalizedDescription,
        hours: body.hours?.toString() || "0",
        workLink,
        status: "APPROVED",
      })
      .onConflictDoUpdate({
        target: [timesheets.orgId, timesheets.userId, timesheets.date],
        targetWhere: sql`ticket_id IS NULL`,
        set: {
          description: normalizedDescription,
          hours: body.hours ? body.hours.toString() : sql`${timesheets.hours}`,
          workLink,
          status: "APPROVED",
          updatedAt: new Date(),
        },
      })
      .returning();

    return ok(upserted, 201);
  });
}
