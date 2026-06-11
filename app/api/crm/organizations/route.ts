import { withAuth, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { paginationSchema, searchSchema } from "@/lib/validation";
import { paginateOffset } from "@/lib/api/list-response";
import { db } from "@/lib/db";
import { crmOrganizations } from "@/lib/db/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";
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

const listQuerySchema = paginationSchema
  .merge(searchSchema)
  .extend({
    search: z.string().optional(),
  });

function escapeLike(input: string): string {
  return input.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { page, pageSize, search } = parseQuery(req, listQuerySchema);
    const { offset, limit } = paginateOffset({ page, pageSize });

    const searchTerm = (search ?? req.nextUrl.searchParams.get("q") ?? "").trim();

    const where = and(
      eq(crmOrganizations.orgId, session.orgId),
      searchTerm
        ? ilike(crmOrganizations.name, `%${escapeLike(searchTerm)}%`)
        : undefined,
    );

    const [organizations, countRow] = await Promise.all([
      db
        .select()
        .from(crmOrganizations)
        .where(where)
        .orderBy(desc(crmOrganizations.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(crmOrganizations)
        .where(where)
        .then((rows) => rows[0]),
    ]);

    const totalCount = Number(countRow?.count ?? 0);
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    return ok({
      organizations,
      totalCount,
      page,
      totalPages,
    });
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
