import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  suggestTaskAssignments,
  analyzeWorkload,
} from "../../../../lib/ai/automation";

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type");
    const projectId = searchParams.get("projectId");

    if (type === "tasks" && projectId) {
      const suggestions = await suggestTaskAssignments(
        orgId,
        parseInt(projectId)
      );
      return NextResponse.json({ suggestions });
    }

    if (type === "workload") {
      const workload = await analyzeWorkload(orgId);
      return NextResponse.json({ workload });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
