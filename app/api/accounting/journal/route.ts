import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema/accounting";
import { withRoles, parseQuery, ok } from "@/lib/api/helpers";
import { listJournalQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { paginateOffset, buildListResponse } from "@/lib/api/list-response";

export async function GET(req: NextRequest) {
  return withRoles(["OWNER", "CEO", "HR"], async (session) => {
    const { page, pageSize, from, to, sourceType } = parseQuery(req, listJournalQuerySchema);

    const fromStr = from ? from.toISOString().slice(0, 10) : undefined;
    const toStr = to ? to.toISOString().slice(0, 10) : undefined;

    const tag = orgScopedTag(CacheTag.journal, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const conds = [eq(journalEntries.orgId, session.orgId)];
        if (fromStr) conds.push(gte(journalEntries.entryDate, fromStr));
        if (toStr) conds.push(lte(journalEntries.entryDate, toStr));
        if (sourceType) conds.push(eq(journalEntries.sourceType, sourceType));

        const { offset, limit } = paginateOffset({ page, pageSize });
        const items = await db
          .select()
          .from(journalEntries)
          .where(and(...conds))
          .orderBy(desc(journalEntries.entryDate), asc(journalEntries.id))
          .offset(offset)
          .limit(limit);
        const totalRows = await db.select({ c: count() }).from(journalEntries).where(and(...conds));
        return buildListResponse(items, Number(totalRows[0]?.c ?? 0), { page, pageSize });
      },
      [tag, `journal:${page}:${pageSize}:${fromStr ?? ""}:${toStr ?? ""}:${sourceType ?? ""}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
