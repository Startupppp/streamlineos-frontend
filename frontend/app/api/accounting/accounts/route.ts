import { and, asc, count, eq, ilike } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ledgerAccounts } from "@/lib/db/schema/accounting";
import { withModuleAbility, parseQuery, parseBody, ok, err } from "@/lib/api/helpers";
import { listAccountsQuerySchema, createAccountSchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { paginateOffset, buildListResponse } from "@/lib/api/list-response";
import { seedChartOfAccountsForOrg } from "@/lib/accounting/seed-coa";

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:accounts", async (session) => {
    const { page, pageSize, q, type, activeOnly } = parseQuery(req, listAccountsQuerySchema);

    await seedChartOfAccountsForOrg(session.orgId);

    const tag = orgScopedTag(CacheTag.ledgerAccounts, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const conds = [eq(ledgerAccounts.orgId, session.orgId)];
        if (type) conds.push(eq(ledgerAccounts.accountType, type));
        if (activeOnly) conds.push(eq(ledgerAccounts.isActive, true));
        if (q) conds.push(ilike(ledgerAccounts.name, `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`));

        const { offset, limit } = paginateOffset({ page, pageSize });
        const items = await db
          .select()
          .from(ledgerAccounts)
          .where(and(...conds))
          .orderBy(asc(ledgerAccounts.code))
          .offset(offset)
          .limit(limit);
        const totalRows = await db.select({ c: count() }).from(ledgerAccounts).where(and(...conds));
        return buildListResponse(items, Number(totalRows[0]?.c ?? 0), { page, pageSize });
      },
      [tag, `accounts:${page}:${pageSize}:${q ?? ""}:${type ?? ""}:${activeOnly ?? ""}`],
      { tags: [tag], revalidate: 300 },
    );

    return ok(await fetcher());
  });
}

export async function POST(req: NextRequest) {
  return withModuleAbility("accounting", "create", "accounting:accounts", async (session) => {
    const input = await parseBody(req, createAccountSchema);

    const existing = await db
      .select({ id: ledgerAccounts.id })
      .from(ledgerAccounts)
      .where(and(eq(ledgerAccounts.orgId, session.orgId), eq(ledgerAccounts.code, input.code)))
      .limit(1);
    if (existing.length > 0) return err("Account code already exists", 409);

    const inserted = await db
      .insert(ledgerAccounts)
      .values({ ...input, orgId: session.orgId })
      .returning();

    revalidateTag(orgScopedTag(CacheTag.ledgerAccounts, session.orgId), "default");
    return ok(inserted[0], 201);
  });
}
