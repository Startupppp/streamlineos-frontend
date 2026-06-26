import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/helpers";
import {
  suggestTaskAssignments,
  analyzeWorkload,
} from "@/lib/ai/automation";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
    const orgId = session.orgId;

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type");
    const projectIdParam = searchParams.get("projectId");

    if (type === "tasks" && projectIdParam) {
      const projectId = parseInt(projectIdParam, 10);
      if (isNaN(projectId) || projectId <= 0) {
        return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
      }
      const suggestions = await suggestTaskAssignments(orgId, projectId);
      return NextResponse.json({ suggestions });
    }

    if (type === "workload") {
      const workload = await analyzeWorkload(orgId);
      return NextResponse.json({ workload });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (error) {
      logger.error("AI suggestions error", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}
