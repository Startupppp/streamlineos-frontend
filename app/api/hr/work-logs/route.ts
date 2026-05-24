import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getWorkLogs } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getWorkLogBlockReason } from "@/lib/hr/work-log-guard";

const postWorkLogSchema = z.object({
  date: z.string(),
  hours: z.number().optional(),
  description: z
    .string()
    .max(5000, "Description must be at most 5000 characters")
    .optional(),
  workLink: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;
    const year = searchParams.get("year");
    const quarter = searchParams.get("quarter");

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' work logs.", 403);
    }

    if (!year || !quarter) {
      return err("year and quarter query params are required.", 400);
    }

    const data = await getWorkLogs(
      session.orgId,
      session.user.id,
      Number(year),
      Number(quarter),
      filterUserId
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, postWorkLogSchema);

    const dateStr = formatDateOnly(body.date);

    const blockReason = await getWorkLogBlockReason(
      session.orgId,
      session.user.id,
      dateStr,
    );
    if (blockReason) {
      return err(blockReason, 400);
    }

    const normalizedDescription = body.description
      ? body.description.replace(
          /(^\s*\w|[.!?]\s+\w)/g,
          (c) => c.toUpperCase()
        )
      : body.description;

    const existing = await db.query.timesheets.findFirst({
      where: and(
        eq(timesheets.orgId, session.orgId),
        eq(timesheets.userId, session.user.id),
        eq(timesheets.date, dateStr)
      ),
    });

    const workLink = body.workLink || null;

    if (existing) {
      const [updated] = await db
        .update(timesheets)
        .set({
          description: normalizedDescription,
          hours: body.hours?.toString() || existing.hours,
          workLink,
          status: "APPROVED",
          updatedAt: new Date(),
        })
        .where(eq(timesheets.id, existing.id))
        .returning();
      return ok(updated);
    }

    const [created] = await db
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
      .returning();

    return ok(created);
  });
}
