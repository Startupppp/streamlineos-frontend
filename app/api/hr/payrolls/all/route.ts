import { withModuleAbility, ok, err } from "@/lib/api/helpers";
import { getAllPayrolls } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withModuleAbility("hr", "view", "hr:payroll", async (session) => {
    const month = req.nextUrl.searchParams.get("month") ?? undefined;
    const year = req.nextUrl.searchParams.get("year") ?? undefined;
    if (!month && !year) return err("Either month (YYYY-MM) or year (YYYY) query param is required.", 400);

    const data = await getAllPayrolls(session.orgId, { month, year });
    return ok(data);
  });
}
