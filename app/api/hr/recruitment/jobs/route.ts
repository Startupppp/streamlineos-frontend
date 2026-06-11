import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const createJobSchema = z.object({
  title: z.string(),
  departmentId: z.number().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  experience: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  openings: z.number().optional(),
  applicationDeadline: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, limit } = parseQuery(req, listSchema);
    const orgId = session.orgId;

    const key = `hr:jobs:list:${orgId}:${status ?? ""}:${limit}`;
    const data = await cached(
      key,
      () => {
        const conditions = [eq(jobPostings.orgId, orgId)];
        if (status) conditions.push(eq(jobPostings.status, status));
        return db.query.jobPostings.findMany({
          where: and(...conditions),
          orderBy: [desc(jobPostings.createdAt)],
          limit,
        });
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:employees")) {
      return err("Only admins can create job postings.", 403);
    }

    const body = await parseBody(req, createJobSchema);

    if (!body.title) return err("title is required.", 400);

    const [job] = await db
      .insert(jobPostings)
      .values({
        orgId: session.orgId,
        title: body.title,
        departmentId: body.departmentId,
        location: body.location,
        type: body.type || "FULL_TIME",
        experience: body.experience,
        salaryMin: body.salaryMin?.toString(),
        salaryMax: body.salaryMax?.toString(),
        description: body.description,
        requirements: body.requirements,
        benefits: body.benefits,
        openings: body.openings || 1,
        applicationDeadline: body.applicationDeadline
          ? formatDateOnly(new Date(body.applicationDeadline))
          : undefined,
        status: "DRAFT",
        postedBy: session.user.id,
      })
      .returning();

    await invalidateCachePattern(`hr:jobs:list:${session.orgId}:*`);

    return ok(job);
  });
}
