import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const generateSchema = z.object({
  baseUrl: z.string().url("Must be a valid URL"),
  source: z.string().min(1, "UTM source is required"),
  medium: z.string().min(1, "UTM medium is required"),
  campaign: z.string().min(1, "UTM campaign is required"),
  term: z.string().optional(),
  content: z.string().optional(),
});

const attributionSchema = z.object({
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
});

/** POST /api/marketing/utm — Generate a UTM-tagged URL */
export async function POST(req: NextRequest) {
  return withAuth(async () => {
    const input = await parseBody(req, generateSchema);

    const url = new URL(input.baseUrl);
    url.searchParams.set("utm_source", input.source);
    url.searchParams.set("utm_medium", input.medium);
    url.searchParams.set("utm_campaign", input.campaign);
    if (input.term) url.searchParams.set("utm_term", input.term);
    if (input.content) url.searchParams.set("utm_content", input.content);

    return ok({
      url: url.toString(),
      params: {
        utm_source: input.source,
        utm_medium: input.medium,
        utm_campaign: input.campaign,
        utm_term: input.term,
        utm_content: input.content,
      },
    });
  });
}

/** GET /api/marketing/utm — Get lead attribution by UTM source */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, attributionSchema);

    // Count leads by source (which maps to UTM source in many cases)
    const attribution = await db
      .select({
        source: leads.source,
        count: sql<number>`count(*)::int`,
        totalValue: sql<number>`coalesce(sum(${leads.potentialValue}::numeric), 0)::int`,
      })
      .from(leads)
      .where(eq(leads.orgId, session.orgId))
      .groupBy(leads.source);

    return ok({ attribution });
  });
}
