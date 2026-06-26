import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { scheduledReports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  reportConfig: z.object({
    entity: z.enum(["candidates", "jobs", "interviews", "offers"]),
    fields: z.array(z.string()).min(1),
    filters: z.object({
      status: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      departmentId: z.number().int().positive().optional(),
    }).default({}),
  }),
  schedule: z.enum(["WEEKLY", "MONTHLY"]),
  recipients: z.array(z.string().email()).min(1),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role)) return err("Forbidden", 403);
    const reports = await db.query.scheduledReports.findMany({
      where: eq(scheduledReports.orgId, session.orgId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
    return ok(reports);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role)) return err("Forbidden", 403);
    const body = await parseBody(req, createSchema);
    const [report] = await db
      .insert(scheduledReports)
      .values({
        orgId: session.orgId,
        createdBy: session.user.id,
        name: body.name,
        reportConfig: body.reportConfig,
        schedule: body.schedule,
        recipients: body.recipients,
      })
      .returning();
    return ok(report, 201);
  });
}
