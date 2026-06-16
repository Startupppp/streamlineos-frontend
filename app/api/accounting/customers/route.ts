import { and, asc, count, desc, eq, gt, ilike, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { clients, invoices, payments } from "@/lib/db/schema/crm";
import { withModuleAbility, parseQuery, ok } from "@/lib/api/helpers";
import { listCustomersOutstandingQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { paginateOffset, buildListResponse } from "@/lib/api/list-response";
import type { CustomerOutstanding } from "@/types/accounting";

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    const { page, pageSize, q, onlyOutstanding } = parseQuery(req, listCustomersOutstandingQuerySchema);

    const tag = orgScopedTag(CacheTag.customerLedger, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const invoicedExpr = sql<string>`COALESCE(SUM(${invoices.total}), 0)`;
        const invoiceCountExpr = sql<number>`COUNT(DISTINCT ${invoices.id})`;
        const paidExpr = sql<string>`COALESCE((
          SELECT SUM(${payments.amount})
          FROM ${payments}
          WHERE ${payments.orgId} = ${session.orgId}
            AND ${payments.invoiceId} IN (
              SELECT ${invoices.id}
              FROM ${invoices}
              WHERE ${invoices.orgId} = ${session.orgId}
                AND ${invoices.clientId} = ${clients.id}
            )
        ), 0)`;
        const outstandingExpr = sql<string>`(COALESCE(SUM(${invoices.total}), 0) - ${paidExpr})`;

        const conds = [eq(clients.orgId, session.orgId)];
        if (q) {
          conds.push(ilike(clients.name, `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`));
        }

        const baseQuery = db
          .select({
            clientId: clients.id,
            clientName: clients.name,
            state: clients.state,
            gstin: clients.gstin,
            invoiceCount: invoiceCountExpr,
            outstanding: outstandingExpr,
          })
          .from(clients)
          .leftJoin(
            invoices,
            and(eq(invoices.clientId, clients.id), eq(invoices.orgId, session.orgId)),
          )
          .where(and(...conds))
          .groupBy(clients.id, clients.name, clients.state, clients.gstin);

        const filteredQuery = onlyOutstanding ? baseQuery.having(gt(outstandingExpr, "0")) : baseQuery;

        const { offset, limit } = paginateOffset({ page, pageSize });
        const rows = await filteredQuery
          .orderBy(desc(outstandingExpr), asc(clients.name))
          .offset(offset)
          .limit(limit);

        const items: CustomerOutstanding[] = rows.map((r) => ({
          clientId: r.clientId,
          clientName: r.clientName,
          state: r.state,
          gstin: r.gstin,
          invoiceCount: Number(r.invoiceCount ?? 0),
          outstanding: Number(r.outstanding ?? 0).toFixed(2),
        }));

        const totalRows = onlyOutstanding
          ? await db
              .select({ c: count() })
              .from(
                db
                  .select({ id: clients.id })
                  .from(clients)
                  .leftJoin(
                    invoices,
                    and(eq(invoices.clientId, clients.id), eq(invoices.orgId, session.orgId)),
                  )
                  .where(and(...conds))
                  .groupBy(clients.id)
                  .having(gt(outstandingExpr, "0"))
                  .as("filtered_clients"),
              )
          : await db.select({ c: count() }).from(clients).where(and(...conds));

        return buildListResponse(items, Number(totalRows[0]?.c ?? 0), { page, pageSize });
      },
      [tag, `customers:${page}:${pageSize}:${q ?? ""}:${onlyOutstanding ?? ""}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
