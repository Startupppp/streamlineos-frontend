import { withModuleAbility, ok, err } from "@/lib/api/helpers";
import { getAllPayrolls } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withModuleAbility("hr", "view", "hr:payroll", async (session) => {
    const month = req.nextUrl.searchParams.get("month");
    if (!month) return err("month query param is required (YYYY-MM).", 400);

    const data = await getAllPayrolls(session.orgId, month);
    return ok(data);
  });
}
