import { withAuth, ok } from "@/lib/api/helpers";
import { getEmployeeProjects } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const userId = req.nextUrl.searchParams.get("userId") || session.user.id;
    const data = await getEmployeeProjects(session.orgId, userId);
    return ok(data);
  });
}
