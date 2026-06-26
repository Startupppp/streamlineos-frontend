import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import {
  completeStockTransfer,
  completeTransferSchema,
} from "@/lib/services/inventory/stock";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  return withAbility("transfer", "inventory:stock", async (session) => {
    try {
      const { transferId: rawId } = await params;
      const transferId = Number(rawId);
      if (!Number.isFinite(transferId)) return err("Invalid transfer ID", 400);

      const input = await parseBody(req, completeTransferSchema);
      const result = await completeStockTransfer(
        session.orgId,
        session.user.id,
        transferId,
        input
      );
      return ok(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to complete transfer";
      return err(message, 500);
    }
  });
}
