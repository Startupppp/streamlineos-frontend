import { type NextRequest } from "next/server";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { getSalesOrderById } from "@/server/queries/inventory/sales-orders";

type RouteContext = { params: Promise<{ soId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { soId: rawSoId } = await params;
  const soId = Number(rawSoId);

  return withAbility("read", "inventory:sales-orders", async (session) => {
    if (!Number.isInteger(soId) || soId <= 0) {
      return err("Invalid sales order id", 400);
    }

    try {
      const so = await getSalesOrderById(session.orgId, soId);
      if (!so) return err("Sales order not found", 404);
      return ok(so);
    } catch {
      return err("Failed to load sales order", 500);
    }
  });
}
