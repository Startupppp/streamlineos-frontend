import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { commissionRules } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  type: z.enum(["flat_percent", "tiered"]).default("flat_percent"),
  flatRate: z.string().optional(),
  tiers: z.array(z.object({
    minValue: z.number(),
    maxValue: z.number().optional(),
    rate: z.number(),
  })).optional(),
  appliesTo: z.string().default("all"),
});

export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;
    const key = `sales:commission-rules:${orgId}`;
    const rules = await cached(
      key,
      () =>
        db
          .select({
            id: commissionRules.id,
            name: commissionRules.name,
            type: commissionRules.type,
            flatRate: commissionRules.flatRate,
            tiers: commissionRules.tiers,
            appliesTo: commissionRules.appliesTo,
            createdAt: commissionRules.createdAt,
          })
          .from(commissionRules)
          .where(eq(commissionRules.orgId, orgId))
          .orderBy(desc(commissionRules.createdAt)),
      { ttlSeconds: CACHE_TTL.LONG },
    );
    return ok(rules);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    const ability = await getSessionAbility();

    if (!ability.can("manage", "settings")) return err("Only admins can create commission rules", 403);

    const input = await parseBody(req, createSchema);
    const [rule] = await db.insert(commissionRules).values({
      orgId: session.orgId,
      name: input.name,
      type: input.type,
      flatRate: input.flatRate ?? null,
      tiers: input.tiers ?? null,
      appliesTo: input.appliesTo,
    }).returning();

    await invalidateCachePattern(`sales:commission-rules:${session.orgId}*`);

    return ok(rule, 201);
  });
}
