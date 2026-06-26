import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { shipSalesOrder, shipSalesOrderSchema, isSoHttpError } from "@/lib/services/inventory/sales-orders";

type RouteContext = { params: Promise<{ soId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { soId: rawSoId } = await params;
  const soId = Number(rawSoId);

  return withAbility("ship", "inventory:sales-orders", async (session) => {
    if (!Number.isInteger(soId) || soId <= 0) {
      return err("Invalid sales order id", 400);
    }

    try {
      const input = await parseBody(req, shipSalesOrderSchema);
      const updated = await shipSalesOrder(session.orgId, soId, input, session.user.id);
      revalidateTag(orgScopedTag(CacheTag.invSalesOrders, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.invStockSummary, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.invMovements, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.invDashboard, session.orgId), "default");
      return ok(updated);
    } catch (e) {
      if (isSoHttpError(e)) return err(e.message, e.httpStatus);
      return err("Failed to ship sales order", 500);
    }
  });
}
