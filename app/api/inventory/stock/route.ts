import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseQuery, serverErr } from "@/lib/api/helpers";
import { listStockLevels } from "@/server/queries/inventory/stock";
import { listStockLevelsSchema } from "@/lib/services/inventory/stock";

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:stock", async (session) => {
    try {
      const { warehouseId, productId, lowStock, page, limit } = parseQuery(
        req,
        listStockLevelsSchema
      );
      const data = await listStockLevels(session.orgId, {
        warehouseId,
        productId,
        lowStock,
        page,
        limit,
      });
      return ok(data);
    } catch (error) {
      return serverErr("Failed to load stock levels", error);
    }
  });
}
