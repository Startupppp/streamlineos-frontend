import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { emailCampaigns } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const listSchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

const createSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  templateId: z.number().optional(),
  recipientFilter: z.object({
    status: z.string().optional(),
    source: z.string().optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  scheduledAt: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, limit } = parseQuery(req, listSchema);
    const orgId = session.orgId;

    const key = `marketing:email-campaigns:list:${orgId}:${status ?? ""}:${limit ?? 25}`;
    const campaigns = await cached(
      key,
      () => {
        const conditions = [eq(emailCampaigns.orgId, orgId)];
        if (status) conditions.push(eq(emailCampaigns.status, status));
        return db
          .select({
            id: emailCampaigns.id,
            name: emailCampaigns.name,
            subject: emailCampaigns.subject,
            status: emailCampaigns.status,
            recipientCount: emailCampaigns.recipientCount,
            sentCount: emailCampaigns.sentCount,
            failedCount: emailCampaigns.failedCount,
            openCount: emailCampaigns.openCount,
            clickCount: emailCampaigns.clickCount,
            scheduledAt: emailCampaigns.scheduledAt,
            sentAt: emailCampaigns.sentAt,
            createdAt: emailCampaigns.createdAt,
          })
          .from(emailCampaigns)
          .where(and(...conditions))
          .orderBy(desc(emailCampaigns.createdAt))
          .limit(limit ?? 25);
      },
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(campaigns);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [campaign] = await db.insert(emailCampaigns).values({
      orgId: session.orgId,
      name: input.name,
      subject: input.subject,
      body: input.body,
      templateId: input.templateId ?? null,
      recipientFilter: input.recipientFilter ?? null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      createdBy: session.user.id,
    }).returning();

    await invalidateCachePattern(`marketing:email-campaigns:list:${session.orgId}:*`);

    return ok(campaign, 201);
  });
}
