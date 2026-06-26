import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { withAbility, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { listSalesOrders } from "@/server/queries/inventory/sales-orders";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { createSalesOrder, createSalesOrderSchema, listSalesOrdersSchema } from "@/lib/services/inventory/sales-orders";

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:sales-orders", async (session) => {
    try {
      const { status, clientId, page, limit } = parseQuery(req, listSalesOrdersSchema);
      const data = await listSalesOrders(session.orgId, { status, clientId, page, limit });
      return ok(data);
    } catch {
      return err("Failed to load sales orders", 500);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAbility("create", "inventory:sales-orders", async (session) => {
    try {
      const input = await parseBody(req, createSalesOrderSchema);
      const so = await createSalesOrder(session.orgId, session.user.id, input);
      revalidateTag(orgScopedTag(CacheTag.invSalesOrders, session.orgId), "default");
      return ok(so, 201);
    } catch {
      return err("Failed to create sales order", 500);
    }
  });
}
