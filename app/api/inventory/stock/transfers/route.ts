import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody, parseQuery, serverErr } from "@/lib/api/helpers";
import { listStockTransfers } from "@/server/queries/inventory/stock";
import {
  createStockTransfer,
  createTransferSchema,
  listTransfersSchema,
} from "@/lib/services/inventory/stock";

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:stock", async (session) => {
    try {
      const { page, limit } = parseQuery(req, listTransfersSchema);
      const data = await listStockTransfers(session.orgId, { page, limit });
      return ok(data);
    } catch (error) {
      return serverErr("Failed to load stock transfers", error);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAbility("transfer", "inventory:stock", async (session) => {
    try {
      const input = await parseBody(req, createTransferSchema);
      const result = await createStockTransfer(
        session.orgId,
        session.user.id,
        input
      );
      return ok(result, 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create transfer";
      return err(message, 500);
    }
  });
}
