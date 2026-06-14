import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, projectDailySnapshots } from "@/lib/db/schema";
import { eq, and, gte, asc } from "drizzle-orm";
import { addDays } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";

type RouteContext = { params: Promise<{ projectId: string }> };

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(180).default(30),
});

const STATE_GROUPS = ["backlog", "unstarted", "started", "completed", "cancelled"] as const;

interface CfdResponse {
  dates: string[];
  groups: string[];
  series: Array<{ date: string } & Record<string, number>>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const { days } = parseQuery(req, querySchema);
    const fromDate = formatDateOnly(addDays(new Date(), -(days - 1)));

    const rows = await db
      .select({
        snapshotDate: projectDailySnapshots.snapshotDate,
        stateGroup: projectDailySnapshots.stateGroup,
        count: projectDailySnapshots.count,
      })
      .from(projectDailySnapshots)
      .where(
        and(
          eq(projectDailySnapshots.orgId, session.orgId),
          eq(projectDailySnapshots.projectId, projectId),
          gte(projectDailySnapshots.snapshotDate, fromDate),
        ),
      )
      .orderBy(asc(projectDailySnapshots.snapshotDate));

    const empty: CfdResponse = { dates: [], groups: [...STATE_GROUPS], series: [] };
    if (rows.length === 0) return ok(empty);

    const byDate = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const bucket = byDate.get(row.snapshotDate) ?? {};
      bucket[row.stateGroup] = (bucket[row.stateGroup] ?? 0) + row.count;
      byDate.set(row.snapshotDate, bucket);
    }

    const dates = [...byDate.keys()].sort();
    const series: CfdResponse["series"] = dates.map((date) => {
      const bucket = byDate.get(date)!;
      const entry: { date: string } & Record<string, number> = Object.assign({ date }, {} as Record<string, number>);
      for (const group of STATE_GROUPS) {
        entry[group] = bucket[group] ?? 0;
      }
      return entry;
    });

    return ok<CfdResponse>({ dates, groups: [...STATE_GROUPS], series });
  });
}
