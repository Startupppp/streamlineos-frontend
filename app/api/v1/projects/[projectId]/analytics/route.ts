/**
 * GET /api/v1/projects/[id]/analytics  — project analytics
 */

import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getProjectAnalytics } from "@/server/queries/projects";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const analytics = await getProjectAnalytics(session.orgId!, projectId);

    return ok(analytics);
  });
}
