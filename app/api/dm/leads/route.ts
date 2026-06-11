import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getDmLeads } from "@/server/queries/dm";
import { db } from "@/lib/db";
import { dmLeads } from "@/lib/db/schema";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  whatsappNumber: z.string().optional(),
  sourcePlatform: z.string(),
  campaignId: z.number().optional(),
  campaignType: z.string().optional(),
  leadQuality: z.string().default("warm"),
  notes: z.string().optional(),
  landingPageUrl: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const status = params.get("status") as
        | "pending_review"
        | "verified"
        | "sent_to_hr"
        | "imported_to_pipeline"
        | null;
      const platform = params.get("platform") ?? undefined;
      const search = params.get("search") ?? undefined;
      const page = toNumber(params.get("page")) ?? 1;
      const limit = toNumber(params.get("limit")) ?? 25;

      const orgId = session.orgId;
      const key = `dm:leads:${orgId}:${status ?? ""}:${platform ?? ""}:${search ?? ""}:${page}:${limit}`;
      const data = await cached(
        key,
        () =>
          getDmLeads(orgId, {
            status: status ?? undefined,
            platform,
            search,
            page,
            limit,
          }),
        { ttlSeconds: CACHE_TTL.SHORT },
      );
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load DM leads",
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

      const [lead] = await db
        .insert(dmLeads)
        .values({
          orgId: session.orgId,
          ...input,
          createdBy: session.user.id,
        })
        .returning();

      await invalidateCachePattern(`dm:leads:${session.orgId}:*`);

      return ok(lead, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create DM lead",
        500
      );
    }
  });
}
