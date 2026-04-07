import { withAuth, ok, err } from "@/lib/api/helpers";
import { getAttendanceLogs } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? session.user.id;
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    // Non-admin users can only view their own logs
    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";
    if (userId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' logs.", 403);
    }

    const data = await getAttendanceLogs(
      session.orgId,
      userId,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined
    );
    return ok(data);
  });
}
