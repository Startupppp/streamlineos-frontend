import { type NextRequest } from "next/server";
import { withAbility, ok, serverErr } from "@/lib/api/helpers";
import { getInventoryDashboard } from "@/server/queries/inventory/reports";

export async function GET(_req: NextRequest) {
  return withAbility("read", "inventory:reports", async (session) => {
    try {
      return ok(await getInventoryDashboard(session.orgId));
    } catch (error) {
      return serverErr("Failed to load inventory dashboard", error);
    }
  });
}
