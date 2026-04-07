import { withAuth, ok, err } from "@/lib/api/helpers";
import { getMonthlyAttendance } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") || session.user.id;
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!year || !month) {
      return err("year and month query params are required.", 400);
    }

    const data = await getMonthlyAttendance(session.orgId, userId, year, month);
    return ok(data);
  });
}
