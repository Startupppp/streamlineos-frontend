import { type NextRequest } from "next/server";
import { withAbility, ok, serverErr } from "@/lib/api/helpers";
import { getReorderReport } from "@/server/queries/inventory/reports";

export async function GET(_req: NextRequest) {
  return withAbility("read", "inventory:reports", async (session) => {
    try {
      const items = await getReorderReport(session.orgId);
      return ok({ items });
    } catch (error) {
      return serverErr("Failed to load reorder report", error);
    }
  });
}
