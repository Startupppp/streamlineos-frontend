import { type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { getReorderReport } from "@/server/queries/inventory/reports";

export async function GET(_req: NextRequest) {
  return withAbility("read", "inventory:reports", async (session) => {
    try {
      const tag = orgScopedTag(CacheTag.invReorderReport, session.orgId);
      const fetcher = unstable_cache(
        () => getReorderReport(session.orgId),
        [tag],
        { tags: [tag], revalidate: 120 },
      );
      return ok(await fetcher());
    } catch {
      return err("Failed to load reorder report", 500);
    }
  });
}
