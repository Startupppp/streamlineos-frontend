import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmCampaigns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["active", "paused", "completed"]).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const createSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200),
  status: z.enum(["active", "paused", "completed"]).default("active"),
  channel: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetAudience: z.string().optional(),
  budgetAllocated: z.string().optional(),
});

/** GET /api/marketing/campaigns */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, limit, offset } = parseQuery(req, listSchema);

    const conditions = [eq(crmCampaigns.orgId, session.orgId)];
    if (status) conditions.push(eq(crmCampaigns.status, status));

    const campaigns = await db
      .select()
      .from(crmCampaigns)
      .where(conditions.length === 1 ? conditions[0] : undefined)
      .orderBy(desc(crmCampaigns.createdAt))
      .limit(limit ?? 25)
      .offset(offset ?? 0);

    return ok(campaigns);
  });
}

/** POST /api/marketing/campaigns */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [campaign] = await db
      .insert(crmCampaigns)
      .values({
        orgId: session.orgId,
        name: input.name,
        status: input.status,
        channel: input.channel ?? null,
        description: input.description ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        targetAudience: input.targetAudience ?? null,
        budgetAllocated: input.budgetAllocated ?? null,
        ownerId: session.user.id,
      })
      .returning();

    return ok(campaign, 201);
  });
}
