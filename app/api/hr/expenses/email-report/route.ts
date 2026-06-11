import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { emailExpenseReport } from "@/server/actions/expense-export";
import { z } from "zod";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const filtersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.string().optional(),
  categoryId: z.number().int().optional(),
  category: z.string().max(100).optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  userId: z.string().optional(),
  paymentMethod: z.string().max(100).optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  search: z.string().max(200).optional(),
});

const bodySchema = z.object({
  filters: filtersSchema,
  sendTo: z.enum(["CEO", "HR", "BOTH"]).default("BOTH"),
});

export async function POST(req: NextRequest) {
  return withAdmin(async () => {
    const body = await parseBody(req, bodySchema);
    const result = await emailExpenseReport(body.filters, body.sendTo);
    if (!result.success) return err(result.error ?? "Failed to send email", 400);
    return ok({ success: true });
  });
}
