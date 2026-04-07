import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmOrganizations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]).optional(),
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await db
      .select()
      .from(crmOrganizations)
      .where(eq(crmOrganizations.orgId, session.orgId))
      .orderBy(desc(crmOrganizations.createdAt))
      .limit(100);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);
    const [org] = await db
      .insert(crmOrganizations)
      .values({
        orgId: session.orgId,
        name: input.name,
        domain: input.domain ?? null,
        industry: input.industry ?? null,
        size: input.size ?? null,
        website: input.website || null,
        linkedinUrl: input.linkedinUrl || null,
        description: input.description ?? null,
      })
      .returning();
    return ok(org, 201);
  });
}
