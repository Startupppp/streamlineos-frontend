import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  status: z.enum(["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const NAME_REGEX = /[a-zA-Z]/;

const createCandidateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be at most 50 characters").regex(NAME_REGEX, "First name must contain at least one letter"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be at most 50 characters").regex(NAME_REGEX, "Last name must contain at least one letter"),
  email: z.string().trim().email("Valid email is required").max(254, "Email must be at most 254 characters"),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Phone must be 8-15 digits, optionally starting with +").optional().or(z.literal("")),
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

    const existing = await db.query.candidates.findFirst({
      where: and(
        eq(candidates.orgId, session.orgId),
        ilike(candidates.email, body.email.trim()),
      ),
      columns: { id: true },
    });
    if (existing) {
      return err("A candidate with this email already exists in your organization.", 409);
    }

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

    return ok(candidate, 201);
  });
}
