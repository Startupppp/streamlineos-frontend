import { type NextRequest } from "next/server";
import { withAbility, ok, err, serverErr } from "@/lib/api/helpers";
import { getPurchaseOrder } from "@/server/queries/inventory/purchase-orders";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ poId: string }> },
) {
  return withAbility("read", "inventory:purchase-orders", async (session) => {
    try {
      const { poId: id } = await params;
      const poId = Number(id);
      if (!Number.isFinite(poId)) return err("Invalid ID", 400);

      const po = await getPurchaseOrder(session.orgId, poId);
      if (!po) return err("Purchase order not found", 404);
      return ok(po);
    } catch (error) {
      return serverErr("Failed to load purchase order", error);
    }
  });
}
