import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import {
  createStockAdjustment,
  createAdjustmentSchema,
} from "@/lib/services/inventory/stock";

export async function POST(req: NextRequest) {
  return withAbility("adjust", "inventory:stock", async (session) => {
    try {
      const input = await parseBody(req, createAdjustmentSchema);
      const result = await createStockAdjustment(
        session.orgId,
        session.user.id,
        input
      );
      return ok(result, 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create adjustment";
      return err(message, 500);
    }
  });
}
