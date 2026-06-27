import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody, parseQuery, serverErr } from "@/lib/api/helpers";
import { getPurchaseOrders } from "@/server/queries/inventory/purchase-orders";
import {
  createPurchaseOrder,
  createPurchaseOrderSchema,
  listPurchaseOrdersSchema,
} from "@/lib/services/inventory/purchase-orders";

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:purchase-orders", async (session) => {
    try {
      const { status, vendorId, page, limit } = parseQuery(req, listPurchaseOrdersSchema);
      const data = await getPurchaseOrders(session.orgId, { status, vendorId, page, limit });
      return ok(data);
    } catch (error) {
      return serverErr("Failed to load purchase orders", error);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAbility("create", "inventory:purchase-orders", async (session) => {
    try {
      const input = await parseBody(req, createPurchaseOrderSchema);
      const po = await createPurchaseOrder(session.orgId, session.user.id, input);
      return ok(po, 201);
    } catch (error) {
      return serverErr("Failed to create purchase order", error);
    }
  });
}
