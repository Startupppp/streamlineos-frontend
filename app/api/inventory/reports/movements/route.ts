import { type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { withAbility, ok, err, parseQuery } from "@/lib/api/helpers";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { getMovementsReport } from "@/server/queries/inventory/reports";

const movementsQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:reports", async (session) => {
    try {
      const { fromDate, toDate } = parseQuery(req, movementsQuerySchema);

      const tag = orgScopedTag(CacheTag.invMovements, session.orgId);
      const fetcher = unstable_cache(
        () => getMovementsReport(session.orgId, fromDate, toDate),
        [tag, `movements:${fromDate}:${toDate}`],
        { tags: [tag], revalidate: 60 },
      );
      return ok(await fetcher());
    } catch {
      return err("Failed to load movements report", 500);
    }
  });
}
