import { withAuth, ok, err } from "@/lib/api/helpers";
import { getAttendanceLogs } from "@/server/queries/hr";
import type { NextRequest } from "next/server";
import { getSessionAbility } from "@/lib/abilities-server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? session.user.id;
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const role = session.user.role;
    const ability = await getSessionAbility();

    const isAdmin = ability.can("manage", "hr:attendance");
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
