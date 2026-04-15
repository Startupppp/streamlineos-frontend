import { ok, err } from "@/lib/api/helpers";
import { emailExpenseReport, type ExportFilters } from "@/server/actions/expense-export";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json() as { filters: ExportFilters; sendTo?: "CEO" | "HR" | "BOTH" };
  const result = await emailExpenseReport(body.filters, body.sendTo ?? "BOTH");
  if (!result.success) return err(result.error ?? "Failed to send email", 400);
  return ok({ success: true });
}
