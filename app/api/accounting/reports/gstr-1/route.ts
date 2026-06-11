import type { NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { withModuleAbility, parseQuery, ok } from "@/lib/api/helpers";
import { gstr1QuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { buildGstr1Report } from "@/lib/services/gstr1-report";
import type { Gstr1Report } from "@/types/accounting";

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    const { from, to } = parseQuery(req, gstr1QuerySchema);

    const tag = orgScopedTag(CacheTag.gstr1, session.orgId);
    const fetcher = unstable_cache(
      (): Promise<Gstr1Report> => buildGstr1Report(session.orgId, from, to),
      [tag, `gstr1:${from}:${to}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
