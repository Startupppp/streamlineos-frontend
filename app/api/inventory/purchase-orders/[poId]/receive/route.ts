import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { getPurchaseOrder } from "@/server/queries/inventory/purchase-orders";
import { receiveGoods, receiveGoodsSchema } from "@/lib/services/inventory/purchase-orders";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poId: string }> },
) {
  return withAbility("receive", "inventory:purchase-orders", async (session) => {
    try {
      const { poId: id } = await params;
      const poId = Number(id);
      if (!Number.isFinite(poId)) return err("Invalid ID", 400);

      const existing = await getPurchaseOrder(session.orgId, poId);
      if (!existing) return err("Purchase order not found", 404);
      if (!["SENT", "PARTIAL"].includes(existing.status)) {
        return err("Goods can only be received against a sent or partially received purchase order", 400);
      }

      const input = await parseBody(req, receiveGoodsSchema);
      const grn = await receiveGoods(session.orgId, session.user.id, poId, input);
      return ok(grn, 201);
    } catch {
      return err("Failed to record goods receipt", 500);
    }
  });
}
