import { withAuth, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  status: z.enum(["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const createCandidateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  resumeUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  currentCompany: z.string().optional(),
  currentRole: z.string().optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  skills: z.array(z.string()).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, limit, offset } = parseQuery(req, listSchema);
    const orgId = session.orgId;

    const key = `hr:candidates:list:${orgId}:${status ?? ""}:${limit}:${offset}`;
    const data = await cached(
      key,
      () => {
        const conditions = [eq(candidates.orgId, orgId)];
        if (status) conditions.push(eq(candidates.status, status));
        return db.query.candidates.findMany({
          where: and(...conditions),
          orderBy: [desc(candidates.createdAt)],
          limit,
          offset,
        });
      },
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createCandidateSchema);

    const [candidate] = await db
      .insert(candidates)
      .values({
        orgId: session.orgId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        resumeUrl: body.resumeUrl,
        linkedinUrl: body.linkedinUrl,
        portfolioUrl: body.portfolioUrl,
        currentCompany: body.currentCompany,
        currentRole: body.currentRole,
        experienceYears: body.experienceYears?.toString(),
        skills: body.skills,
        source: body.source || "DIRECT",
        status: "NEW",
        notes: body.notes,
      })
      .returning();

    await invalidateCachePattern(`hr:candidates:list:${session.orgId}:*`);

    return ok(candidate);
  });
}
