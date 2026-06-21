import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { salesQuotas, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { z } from "zod";

const listSchema = z.object({
  userId: z.string().optional(),
  period: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

const createSchema = z.object({
  userId: z.string().min(1, "User is required"),
  period: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  targetRevenue: z.string().min(1, "Target revenue is required").refine(
    (v) => Number.isFinite(Number(v)) && Number(v) > 0,
    "Target revenue must be a positive number",
  ),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: "Start date must be before end date", path: ["endDate"] },
);

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { userId, period, limit } = parseQuery(req, listSchema);

    const data = await cached(
      CACHE_KEYS.quotasList(session.orgId),
      async () => {
        const conditions = [eq(salesQuotas.orgId, session.orgId)];
        if (userId) conditions.push(eq(salesQuotas.userId, userId));
        if (period) conditions.push(eq(salesQuotas.period, period));

        const results = await db
      .select({
        id: salesQuotas.id,
        userId: salesQuotas.userId,
        userName: users.name,
        period: salesQuotas.period,
        startDate: salesQuotas.startDate,
        endDate: salesQuotas.endDate,
        targetRevenue: salesQuotas.targetRevenue,
        actualRevenue: salesQuotas.actualRevenue,
        notes: salesQuotas.notes,
        createdAt: salesQuotas.createdAt,
      })
      .from(salesQuotas)
      .leftJoin(users, eq(salesQuotas.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(salesQuotas.startDate))
      .limit(limit ?? 20);

        return results.map((q) => ({
          ...q,
          attainmentPct: Number(q.targetRevenue) > 0
            ? Math.round((Number(q.actualRevenue) / Number(q.targetRevenue)) * 100)
            : 0,
        }));
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!ADMIN_ROLES.includes(role) && role !== "BRANCH_MANAGER") {
      return err("Only managers can set quotas", 403);
    }

    const input = await parseBody(req, createSchema);

    const [quota] = await db
      .insert(salesQuotas)
      .values({
        orgId: session.orgId,
        userId: input.userId,
        period: input.period,
        startDate: input.startDate,
        endDate: input.endDate,
        targetRevenue: input.targetRevenue,
        notes: input.notes ?? null,
        setById: session.user.id,
      })
      .returning();

    await invalidateCache(CACHE_KEYS.quotasList(session.orgId));
    return ok(quota, 201);
  });
}
