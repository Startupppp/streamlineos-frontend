import type { NextRequest } from "next/server";
import { and, eq, gte, inArray, lte, sum } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { ledgerAccounts, journalEntries, journalLines } from "@/lib/db/schema/accounting";
import { withModuleAbility, parseQuery, ok, err } from "@/lib/api/helpers";
import { profitLossQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { ACCOUNT_CODES } from "@/lib/accounting/posting-rules";
import type { AccountType } from "@/types/accounting";

type SectionKey = "operating" | "investing" | "financing";

const CASH_CODES: ReadonlyArray<string> = [ACCOUNT_CODES.cash, ACCOUNT_CODES.bank];

const SECTION_LABELS: Record<SectionKey, string> = {
  operating: "Operating Activities",
  investing: "Investing Activities",
  financing: "Financing Activities",
};

function previousDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function classify(accountType: AccountType, code: string): SectionKey {
  if (accountType === "EQUITY") return "financing";
  if (accountType === "LIABILITY") {
    return code === "2700" ? "financing" : "operating";
  }
  if (accountType === "ASSET") {
    if (code.startsWith("15") || code === "1600") return "investing";
    return "operating";
  }
  return "operating";
}

export async function GET(req: NextRequest) {
  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    const { from, to } = parseQuery(req, profitLossQuerySchema);
    if (!from || !to) return err("from and to are required", 400);

    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const openingAsOf = previousDay(fromStr);

    const tag = orgScopedTag(CacheTag.cashFlow, session.orgId);
    const fetcher = unstable_cache(
      async () => {
        const cashAccounts = await db
          .select({ id: ledgerAccounts.id, code: ledgerAccounts.code })
          .from(ledgerAccounts)
          .where(
            and(
              eq(ledgerAccounts.orgId, session.orgId),
              inArray(ledgerAccounts.code, [...CASH_CODES]),
            ),
          );
        const cashAccountIds = cashAccounts.map((row) => row.id);

        if (cashAccountIds.length === 0) {
          return {
            from: fromStr,
            to: toStr,
            openingCash: "0.00",
            closingCash: "0.00",
            netChange: "0.00",
            reconciled: true,
            sections: (Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => ({
              key,
              label: SECTION_LABELS[key],
              items: [],
              total: "0.00",
            })),
          };
        }

        const cashNetUpTo = async (asOf: string): Promise<number> => {
          const rows = await db
            .select({ debit: sum(journalLines.debit), credit: sum(journalLines.credit) })
            .from(journalLines)
            .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
            .where(
              and(
                eq(journalEntries.orgId, session.orgId),
                eq(journalEntries.status, "POSTED"),
                lte(journalEntries.entryDate, asOf),
                inArray(journalLines.accountId, cashAccountIds),
              ),
            );
          const row = rows[0];
          return Number(row?.debit ?? 0) - Number(row?.credit ?? 0);
        };

        const openingCash = await cashNetUpTo(openingAsOf);
        const closingCash = await cashNetUpTo(toStr);
        const netChange = closingCash - openingCash;

        const periodCashEntries = await db
          .selectDistinct({ entryId: journalLines.entryId })
          .from(journalLines)
          .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
          .where(
            and(
              eq(journalEntries.orgId, session.orgId),
              eq(journalEntries.status, "POSTED"),
              gte(journalEntries.entryDate, fromStr),
              lte(journalEntries.entryDate, toStr),
              inArray(journalLines.accountId, cashAccountIds),
            ),
          );
        const entryIds = periodCashEntries.map((row) => row.entryId);

        const buckets: Record<SectionKey, Map<string, number>> = {
          operating: new Map(),
          investing: new Map(),
          financing: new Map(),
        };

        if (entryIds.length > 0) {
          const lines = await db
            .select({
              entryId: journalLines.entryId,
              accountId: journalLines.accountId,
              code: ledgerAccounts.code,
              name: ledgerAccounts.name,
              accountType: ledgerAccounts.accountType,
              debit: journalLines.debit,
              credit: journalLines.credit,
            })
            .from(journalLines)
            .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, journalLines.accountId))
            .where(inArray(journalLines.entryId, entryIds));

          const cashIdSet = new Set(cashAccountIds);
          const grouped = new Map<number, typeof lines>();
          for (const line of lines) {
            const existing = grouped.get(line.entryId);
            if (existing) existing.push(line);
            else grouped.set(line.entryId, [line]);
          }

          for (const entryLines of grouped.values()) {
            const cashMovement = entryLines
              .filter((line) => cashIdSet.has(line.accountId))
              .reduce((acc, line) => acc + (Number(line.debit) - Number(line.credit)), 0);
            if (Math.abs(cashMovement) < 0.005) continue;

            const offsetting = entryLines.filter((line) => !cashIdSet.has(line.accountId));
            const offsetTotal = offsetting.reduce(
              (acc, line) => acc + Math.abs(Number(line.debit) - Number(line.credit)),
              0,
            );
            if (offsetTotal < 0.005) continue;

            for (const line of offsetting) {
              const weight = Math.abs(Number(line.debit) - Number(line.credit)) / offsetTotal;
              const inflow = cashMovement * weight;
              if (Math.abs(inflow) < 0.005) continue;
              const section = classify(line.accountType, line.code);
              const key = `${line.code}::${line.name}`;
              const bucket = buckets[section];
              bucket.set(key, (bucket.get(key) ?? 0) + inflow);
            }
          }
        }

        const sections = (Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => {
          const items = Array.from(buckets[key].entries())
            .map(([compound, amount]) => {
              const [code, name] = compound.split("::");
              return { label: `${code} · ${name}`, amount };
            })
            .filter((item) => Math.abs(item.amount) >= 0.005)
            .sort((a, b) => a.label.localeCompare(b.label));
          const total = items.reduce((acc, item) => acc + item.amount, 0);
          return {
            key,
            label: SECTION_LABELS[key],
            items: items.map((item) => ({ label: item.label, amount: item.amount.toFixed(2) })),
            total: total.toFixed(2),
          };
        });

        const sectionsTotal = sections.reduce((acc, section) => acc + Number(section.total), 0);
        const reconciled = Math.abs(sectionsTotal - netChange) < 0.01;

        return {
          from: fromStr,
          to: toStr,
          openingCash: openingCash.toFixed(2),
          closingCash: closingCash.toFixed(2),
          netChange: netChange.toFixed(2),
          reconciled,
          sections,
        };
      },
      [tag, `cashflow:${fromStr}:${toStr}`],
      { tags: [tag], revalidate: 60 },
    );

    return ok(await fetcher());
  });
}
