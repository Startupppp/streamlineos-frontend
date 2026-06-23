import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { scheduledReports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ reportId: string }> };

function isHrRole(role: string) {
  return ["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    if (!isHrRole(session.user.role ?? "")) return err("Forbidden", 403);
    const { reportId } = await params;
    const id = Number(reportId);
    if (!Number.isFinite(id)) return err("Invalid report ID", 400);
    await db
      .delete(scheduledReports)
      .where(and(eq(scheduledReports.id, id), eq(scheduledReports.orgId, session.orgId)));
    return ok({ success: true });
  });
}
