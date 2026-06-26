import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { confirmSalesOrder, isSoHttpError } from "@/lib/services/inventory/sales-orders";

type RouteContext = { params: Promise<{ soId: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { soId: rawSoId } = await params;
  const soId = Number(rawSoId);

  return withAbility("confirm", "inventory:sales-orders", async (session) => {
    if (!Number.isInteger(soId) || soId <= 0) {
      return err("Invalid sales order id", 400);
    }

    try {
      const updated = await confirmSalesOrder(session.orgId, soId);
      revalidateTag(orgScopedTag(CacheTag.invSalesOrders, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.invStockSummary, session.orgId), "default");
      return ok(updated);
    } catch (e) {
      if (isSoHttpError(e)) return err(e.message, e.httpStatus);
      return err("Failed to confirm sales order", 500);
    }
  });
}
