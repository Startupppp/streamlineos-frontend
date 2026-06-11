import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getDmCampaigns } from "@/server/queries/dm";
import { db } from "@/lib/db";
import { crmCampaigns } from "@/lib/db/schema";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["active", "paused", "completed"]).default("active"),
  budgetAllocated: z.string().optional(),
  budgetSpent: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const status = params.get("status") ?? undefined;
      const page = toNumber(params.get("page")) ?? 1;
      const limit = toNumber(params.get("limit")) ?? 25;

      const orgId = session.orgId;
      const key = `dm:campaigns:${orgId}:${status ?? ""}:${page}:${limit}`;
      const data = await cached(
        key,
        () => getDmCampaigns(orgId, { status, page, limit }),
        { ttlSeconds: CACHE_TTL.MEDIUM },
      );
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load DM campaigns",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await req.json();
      const input = createSchema.parse(body);

      const [campaign] = await db
        .insert(crmCampaigns)
        .values({
          orgId: session.orgId,
          ...input,
        })
        .returning();

      await invalidateCachePattern(`dm:campaigns:${session.orgId}:*`);

      return ok(campaign, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create DM campaign",
        500
      );
    }
  });
}
