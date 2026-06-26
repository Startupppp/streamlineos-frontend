import { type NextRequest } from "next/server";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { getPurchaseOrder } from "@/server/queries/inventory/purchase-orders";
import { sendPurchaseOrder } from "@/lib/services/inventory/purchase-orders";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ poId: string }> },
) {
  return withAbility("approve", "inventory:purchase-orders", async (session) => {
    try {
      const { poId: id } = await params;
      const poId = Number(id);
      if (!Number.isFinite(poId)) return err("Invalid ID", 400);

      const existing = await getPurchaseOrder(session.orgId, poId);
      if (!existing) return err("Purchase order not found", 404);
      if (existing.status !== "DRAFT") {
        return err("Only draft purchase orders can be sent", 400);
      }

      const updated = await sendPurchaseOrder(session.orgId, poId);
      return ok(updated);
    } catch {
      return err("Failed to send purchase order", 500);
    }
  });
}
