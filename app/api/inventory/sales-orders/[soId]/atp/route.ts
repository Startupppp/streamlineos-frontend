import { type NextRequest } from "next/server";
import { withAbility, ok, err, serverErr } from "@/lib/api/helpers";
import { getAtpForSalesOrder } from "@/lib/services/inventory/sales-orders";

type RouteContext = { params: Promise<{ soId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { soId: rawSoId } = await params;
  const soId = Number(rawSoId);

  return withAbility("read", "inventory:sales-orders", async (session) => {
    if (!Number.isInteger(soId) || soId <= 0) {
      return err("Invalid sales order id", 400);
    }

    try {
      const atp = await getAtpForSalesOrder(session.orgId, soId);
      if (!atp) return err("Sales order not found", 404);
      return ok(atp);
    } catch (error) {
      return serverErr("Failed to load ATP for sales order", error);
    }
  });
}
