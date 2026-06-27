import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseQuery, serverErr } from "@/lib/api/helpers";
import { listStockTransactions } from "@/server/queries/inventory/stock";
import { listTransactionsSchema } from "@/lib/services/inventory/stock";

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:stock", async (session) => {
    try {
      const parsed = parseQuery(req, listTransactionsSchema);
      const fromDate = parsed.fromDate ?? parsed.dateFrom;
      const toDate = parsed.toDate ?? parsed.dateTo;
      const transactionType = parsed.transactionType ?? parsed.type;

      const data = await listStockTransactions(session.orgId, {
        productVariantId: parsed.productVariantId,
        locationId: parsed.locationId,
        transactionType,
        fromDate,
        toDate,
        page: parsed.page,
        limit: parsed.limit,
      });
      return ok(data);
    } catch (error) {
      return serverErr("Failed to load stock transactions", error);
    }
  });
}
