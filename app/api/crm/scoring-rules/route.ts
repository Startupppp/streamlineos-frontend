import { withAuth, withAbility, ok, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { leadScoringRules } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "gt", "lt", "contains", "in"]),
  value: z.string().min(1),
  points: z.number().int(),
});

export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const key = `crm:scoring-rules:${orgId}`;
    const data = await cached(
      key,
      () =>
        db
          .select({
            id: leadScoringRules.id,
            field: leadScoringRules.field,
            operator: leadScoringRules.operator,
            value: leadScoringRules.value,
            points: leadScoringRules.points,
            createdAt: leadScoringRules.createdAt,
          })
          .from(leadScoringRules)
          .where(eq(leadScoringRules.orgId, orgId))
          .orderBy(desc(leadScoringRules.createdAt))
          .limit(100),
      { ttlSeconds: CACHE_TTL.LONG },
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "crm:scoring-rules", async (session) => {
    const input = await parseBody(req, createSchema);
    const [rule] = await db
      .insert(leadScoringRules)
      .values({
        orgId: session.orgId,
        field: input.field,
        operator: input.operator,
        value: input.value,
        points: input.points,
      })
      .returning();
    await invalidateCachePattern(`crm:scoring-rules:${session.orgId}*`);
    return ok(rule, 201);
  });
}
