import { type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { getInventoryDashboard } from "@/server/queries/inventory/reports";

export async function GET(_req: NextRequest) {
  return withAbility("read", "inventory:reports", async (session) => {
    try {
      const tag = orgScopedTag(CacheTag.invDashboard, session.orgId);
      const fetcher = unstable_cache(
        () => getInventoryDashboard(session.orgId),
        [tag],
        { tags: [tag], revalidate: 60 },
      );
      return ok(await fetcher());
    } catch {
      return err("Failed to load inventory dashboard", 500);
    }
  });
}
