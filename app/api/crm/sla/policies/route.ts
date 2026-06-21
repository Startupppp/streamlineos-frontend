import { withAuth, withAbility, ok, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { crmSla } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1),
  appliesTo: z.enum(["lead", "deal", "both"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  firstResponseHours: z.number().int().positive(),
  resolutionHours: z.number().int().positive(),
});

export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const key = `crm:sla-policies:${orgId}`;
    const data = await cached(
      key,
      () =>
        db
          .select({
            id: crmSla.id,
            name: crmSla.name,
            appliesTo: crmSla.appliesTo,
            priority: crmSla.priority,
            firstResponseHours: crmSla.firstResponseHours,
            resolutionHours: crmSla.resolutionHours,
            createdAt: crmSla.createdAt,
          })
          .from(crmSla)
          .where(eq(crmSla.orgId, orgId))
          .orderBy(desc(crmSla.createdAt))
          .limit(100),
      { ttlSeconds: CACHE_TTL.LONG },
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "crm:sla", async (session) => {
    const input = await parseBody(req, createSchema);
    const [policy] = await db
      .insert(crmSla)
      .values({
        orgId: session.orgId,
        name: input.name,
        appliesTo: input.appliesTo,
        priority: input.priority,
        firstResponseHours: input.firstResponseHours,
        resolutionHours: input.resolutionHours,
      })
      .returning();
    await invalidateCachePattern(`crm:sla-policies:${session.orgId}*`);
    return ok(policy, 201);
  });
}
