import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema/accounting";
import { withModuleAbility, parseQuery, parseBody, ok, err } from "@/lib/api/helpers";
import { listJournalQuerySchema, createJournalEntrySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { paginateOffset, buildListResponse } from "@/lib/api/list-response";
import { persistJournalEntry } from "@/lib/accounting/persist-entry";
import { seedChartOfAccountsForOrg } from "@/lib/accounting/seed-coa";

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:journal", async (session) => {
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

export async function POST(req: NextRequest) {
  return withModuleAbility("accounting", "manage", "accounting:journal", async (session) => {
    const input = await parseBody(req, createJournalEntrySchema);

    const totalDebit = input.lines.reduce((acc, line) => acc + line.debit, 0);
    const totalCredit = input.lines.reduce((acc, line) => acc + line.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.009) {
      return err(`Unbalanced entry: debit ${totalDebit.toFixed(2)} ≠ credit ${totalCredit.toFixed(2)}`, 400);
    }
    for (const line of input.lines) {
      if ((line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0)) {
        return err("Each line must have exactly one of debit or credit > 0", 400);
      }
    }

    await seedChartOfAccountsForOrg(session.orgId);

    const result = await db.transaction(async (tx) => {
      return persistJournalEntry(
        {
          orgId: session.orgId,
          entryDate: input.entryDate,
          description: input.description,
          sourceType: "manual",
          sourceId: null,
          sourceEvent: null,
          status: input.status,
          createdBy: session.user.id,
          lines: input.lines.map((line) => ({
            accountCode: line.accountCode,
            debit: line.debit,
            credit: line.credit,
            description: line.description ?? null,
          })),
        },
        tx,
      );
    });

    revalidateTag(orgScopedTag(CacheTag.journal, session.orgId), "default");
    if (input.status === "POSTED") {
      revalidateTag(orgScopedTag(CacheTag.trialBalance, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.profitLoss, session.orgId), "default");
      revalidateTag(orgScopedTag(CacheTag.balanceSheet, session.orgId), "default");
    }

    return ok(result, 201);
  });
}
