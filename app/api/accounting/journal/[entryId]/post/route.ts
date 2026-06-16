import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema/accounting";
import { withModuleAbility, ok, err } from "@/lib/api/helpers";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";

type RouteContext = { params: Promise<{ entryId: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { entryId: rawEntryId } = await params;
  const entryId = Number(rawEntryId);

  return withModuleAbility("accounting", "manage", "accounting:journal", async (session) => {
    if (!Number.isInteger(entryId) || entryId <= 0) {
      return err("Invalid entry id", 400);
    }
    const rows = await db
      .select({ id: journalEntries.id, status: journalEntries.status })
      .from(journalEntries)
      .where(and(eq(journalEntries.id, entryId), eq(journalEntries.orgId, session.orgId)))
      .limit(1);

    const entry = rows[0];
    if (!entry) return err("Journal entry not found", 404);
    if (entry.status === "POSTED") return err("Entry is already posted", 409);
    if (entry.status === "VOID") return err("Cannot post a voided entry", 409);

    const updated = await db
      .update(journalEntries)
      .set({ status: "POSTED", updatedAt: new Date() })
      .where(and(eq(journalEntries.id, entryId), eq(journalEntries.orgId, session.orgId)))
      .returning({ id: journalEntries.id, entryNumber: journalEntries.entryNumber, status: journalEntries.status });

    revalidateTag(orgScopedTag(CacheTag.journal, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.trialBalance, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.profitLoss, session.orgId), "default");
    revalidateTag(orgScopedTag(CacheTag.balanceSheet, session.orgId), "default");

    return ok(updated[0]);
  });
}
