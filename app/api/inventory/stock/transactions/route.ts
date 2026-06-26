import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseQuery } from "@/lib/api/helpers";
import { listStockTransactions } from "@/server/queries/inventory/stock";
import { listTransactionsSchema } from "@/lib/services/inventory/stock";

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:stock", async (session) => {
    try {
      const {
        productVariantId,
        locationId,
        transactionType,
        fromDate,
        toDate,
        page,
        limit,
      } = parseQuery(req, listTransactionsSchema);
      const data = await listStockTransactions(session.orgId, {
        productVariantId,
        locationId,
        transactionType,
        fromDate,
        toDate,
        page,
        limit,
      });
      return ok(data);
    } catch {
      return err("Failed to load stock transactions", 500);
    }
  });
}
