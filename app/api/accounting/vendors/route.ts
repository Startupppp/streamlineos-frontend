import type { NextRequest } from "next/server";
import { and, eq, ilike, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { clients, purchaseBills } from "@/lib/db/schema/crm";
import { withModuleAbility, parseQuery, ok } from "@/lib/api/helpers";
import { listCustomersOutstandingQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { paginateOffset, buildListResponse } from "@/lib/api/list-response";

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    const { page, pageSize, q, onlyOutstanding } = parseQuery(req, listCustomersOutstandingQuerySchema);

    const tag = orgScopedTag(CacheTag.vendorLedger, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const conds = [eq(clients.orgId, session.orgId), eq(clients.isVendor, true)];
        if (q) conds.push(ilike(clients.name, `%${q.replaceAll("%", "\\%")}%`));

        const { offset, limit } = paginateOffset({ page, pageSize });
        const rows = await db
          .select({
            vendorId: clients.id,
            vendorName: clients.name,
            state: clients.state,
            gstin: clients.gstin,
            billCount: sql<number>`COALESCE((SELECT count(*)::int FROM ${purchaseBills} WHERE ${purchaseBills.vendorId} = ${clients.id} AND ${purchaseBills.status} IN ('POSTED','PARTIALLY_PAID','PAID')), 0)`,
            totalBilled: sql<string>`COALESCE((SELECT sum(${purchaseBills.total}::numeric) FROM ${purchaseBills} WHERE ${purchaseBills.vendorId} = ${clients.id} AND ${purchaseBills.status} IN ('POSTED','PARTIALLY_PAID','PAID')), 0)::text`,
            totalPaid: sql<string>`COALESCE((SELECT sum(${purchaseBills.amountPaid}::numeric) FROM ${purchaseBills} WHERE ${purchaseBills.vendorId} = ${clients.id} AND ${purchaseBills.status} IN ('POSTED','PARTIALLY_PAID','PAID')), 0)::text`,
          })
          .from(clients)
          .where(and(...conds))
          .offset(offset)
          .limit(limit);

        const items = rows
          .map((r) => ({
            vendorId: r.vendorId,
            vendorName: r.vendorName,
            state: r.state,
            gstin: r.gstin,
            billCount: Number(r.billCount ?? 0),
            outstanding: (Number(r.totalBilled ?? 0) - Number(r.totalPaid ?? 0)).toFixed(2),
          }))
          .filter((r) => !onlyOutstanding || Number(r.outstanding) > 0.005);

        const totalRows = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(clients)
          .where(and(...conds));
        return buildListResponse(items, Number(totalRows[0]?.c ?? 0), { page, pageSize });
      },
      [tag, `vendors-out:${page}:${pageSize}:${q ?? ""}:${onlyOutstanding ?? ""}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
