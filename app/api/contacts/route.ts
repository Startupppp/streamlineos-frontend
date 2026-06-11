import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getContacts } from "@/server/queries/crm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { z } from "zod";

const listSchema = z.object({
  search: z.string().optional(),
  organizationId: z.coerce.number().optional(),
  limit: z.coerce.number().max(100).optional(),
  offset: z.coerce.number().optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
  organizationId: z.number().optional(),
  linkedinUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  leadId: z.number().optional(),
  dealId: z.number().optional(),
  tags: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, listSchema);
    const orgId = session.orgId!;
    const key = `crm:contacts:list:${orgId}:${filters.search ?? ""}:${filters.organizationId ?? ""}:${filters.limit ?? ""}:${filters.offset ?? ""}`;
    const data = await cached(
      key,
      () => getContacts(orgId, filters),
      { ttlSeconds: CACHE_TTL.SHORT },
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const input = await parseBody(req, createSchema);

    const [contact] = await db.insert(contacts).values({
      name: input.name,
      email: input.email,
      phone: input.phone,
      title: input.title,
      department: input.department,
      company: input.company,
      organizationId: input.organizationId,
      linkedinUrl: input.linkedinUrl,
      twitterUrl: input.twitterUrl,
      websiteUrl: input.websiteUrl,
      leadId: input.leadId,
      dealId: input.dealId,
      tags: input.tags,
      orgId: session.orgId!,
    }).returning();

    await invalidateCachePattern(`crm:contacts:list:${session.orgId}:*`);

    return ok(contact, 201);
  });
}
