import "server-only";
import { and, eq, like, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema/accounting";

export async function nextEntryNumber(orgId: string, year: number): Promise<string> {
  const prefix = `JE-${year}-`;
  const latest = await db
    .select({ entryNumber: journalEntries.entryNumber })
    .from(journalEntries)
    .where(and(eq(journalEntries.orgId, orgId), like(journalEntries.entryNumber, `${prefix}%`)))
    .orderBy(desc(journalEntries.entryNumber))
    .limit(1);

  const last = latest[0]?.entryNumber;
  const lastSeq = last ? parseInt(last.slice(prefix.length), 10) : 0;
  const nextSeq = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}
