import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAbility, ok, serverErr, parseQuery } from "@/lib/api/helpers";
import { getMovementsReport } from "@/server/queries/inventory/reports";
import { subDays, format } from "date-fns";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const defaultTo = format(new Date(), "yyyy-MM-dd");
const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

const movementsQuerySchema = z.object({
  fromDate: dateString.optional(),
  toDate: dateString.optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
});

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:reports", async (session) => {
    try {
      const query = parseQuery(req, movementsQuerySchema);
      const fromDate = query.fromDate ?? query.dateFrom ?? defaultFrom;
      const toDate = query.toDate ?? query.dateTo ?? defaultTo;
      const items = await getMovementsReport(session.orgId, fromDate, toDate);
      return ok({ items });
    } catch (error) {
      return serverErr("Failed to load movements report", error);
    }
  });
}
