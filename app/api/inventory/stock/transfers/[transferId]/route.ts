import { type NextRequest } from "next/server";
import { withAbility, ok, err, serverErr } from "@/lib/api/helpers";
import { getStockTransfer } from "@/server/queries/inventory/stock";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  return withAbility("read", "inventory:stock", async (session) => {
    try {
      const { transferId: rawId } = await params;
      const transferId = Number(rawId);
      if (!Number.isFinite(transferId)) return err("Invalid transfer ID", 400);

      const transfer = await getStockTransfer(session.orgId, transferId);
      if (!transfer) return err("Transfer not found", 404);

      return ok(transfer);
    } catch (error) {
      return serverErr("Failed to load transfer", error);
    }
  });
}
