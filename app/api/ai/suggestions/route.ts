import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import {
  suggestTaskAssignments,
  analyzeWorkload,
} from "../../../../lib/ai/automation";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = (session as { orgId?: string }).orgId || session.user.id;

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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
