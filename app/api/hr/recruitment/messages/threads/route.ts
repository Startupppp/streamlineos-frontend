import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateMessages, candidates } from "@/lib/db/schema";
import { eq, desc, sql, max } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const threads = await db
      .select({
        candidateId: candidateMessages.candidateId,
        lastMessageAt: max(candidateMessages.sentAt),
        messageCount: sql<number>`count(${candidateMessages.id})::int`,
        unreadCount: sql<number>`sum(case when ${candidateMessages.direction} = 'INBOUND' and ${candidateMessages.readAt} is null then 1 else 0 end)::int`,
        lastBody: sql<string>`(array_agg(${candidateMessages.body} order by ${candidateMessages.sentAt} desc))[1]`,
        lastDirection: sql<string>`(array_agg(${candidateMessages.direction} order by ${candidateMessages.sentAt} desc))[1]`,
        candidateFirstName: sql<string>`(array_agg(${candidates.firstName} order by ${candidateMessages.sentAt} desc))[1]`,
        candidateLastName: sql<string>`(array_agg(${candidates.lastName} order by ${candidateMessages.sentAt} desc))[1]`,
        candidateEmail: sql<string>`(array_agg(${candidates.email} order by ${candidateMessages.sentAt} desc))[1]`,
      })
      .from(candidateMessages)
      .leftJoin(candidates, eq(candidateMessages.candidateId, candidates.id))
      .where(eq(candidateMessages.orgId, session.orgId))
      .groupBy(candidateMessages.candidateId)
      .orderBy(desc(max(candidateMessages.sentAt)))
      .limit(100);

    return ok(threads);
  });
}
