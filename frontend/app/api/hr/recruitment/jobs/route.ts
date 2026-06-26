import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const VALID_JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE", "TEMPORARY", "CONSULTANT", "APPRENTICESHIP", "COMMISSION_BASED"] as const;
const MAX_SALARY = 999_999_999;

const createJobBaseSchema = z.object({
  title: z
    .string()
    .min(2, "Job Title must be at least 2 characters")
    .max(100, "Job Title must be at most 100 characters")
    .refine((v) => /^[a-zA-Z]/.test(v.trim()), "Job Title must start with a letter")
    .refine((v) => !/[^a-zA-Z0-9\s\-',]/.test(v.trim()), "Job Title may only contain letters, numbers, hyphens, apostrophes, and commas")
    .refine((v) => !/(.)\1{3,}/.test(v.trim()), "Job Title cannot have 4 or more consecutive identical characters")
    .refine((v) => !/\s{2,}/.test(v), "Job Title cannot have multiple consecutive spaces"),
  departmentId: z.number().int().positive().optional(),
  hiringFlowId: z.number().int().positive().optional(),
  location: z
    .string()
    .min(2, "Location must be at least 2 characters")
    .max(100, "Location must be at most 100 characters")
    .refine((v) => !v || /^[a-zA-Z]/.test(v.trim()), "Location must start with a letter")
    .refine((v) => !v || !/[^a-zA-Z0-9\s\-',]/.test(v.trim()), "Location may only contain letters, numbers, hyphens, apostrophes, and commas")
    .refine((v) => !v || !/(.)\1{3,}/.test(v.trim()), "Location cannot have 4 or more consecutive identical characters")
    .refine((v) => !v || !/\s{2,}/.test(v), "Location cannot have multiple consecutive spaces")
    .optional(),
  type: z.enum(VALID_JOB_TYPES).optional(),
  experience: z.string().max(100).optional(),
  salaryMin: z.number().min(1, "Minimum salary must be greater than 0").max(MAX_SALARY, "Salary value is too large").optional(),
  salaryMax: z.number().min(1, "Maximum salary must be greater than 0").max(MAX_SALARY, "Salary value is too large").optional(),
  description: z.string().max(10000).optional(),
  requirements: z.string().max(5000).optional(),
  benefits: z.string().max(5000).optional(),
  openings: z.number().int().min(1).max(999).optional(),
  applicationDeadline: z
    .string()
    .refine((d) => !d || new Date(d) >= new Date(new Date().toDateString()), "Application deadline cannot be in the past")
    .optional(),
  status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"]).optional(),
});

const createJobSchema = createJobBaseSchema.refine(
  (d) => {
    if (d.salaryMin !== undefined && d.salaryMax !== undefined) {
      return d.salaryMin <= d.salaryMax;
    }
    return true;
  },
  { message: "Minimum salary must be ≤ maximum salary", path: ["salaryMin"] }
);

type CreateJobInput = z.infer<typeof createJobBaseSchema>;

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

    const body = await parseBody(req, createJobSchema) as CreateJobInput;

    const normalizedTitle = body.title.trim().toLowerCase();
    const normalizedLocation = (body.location ?? "").trim().toLowerCase();
    const normalizedType = body.type ?? "FULL_TIME";

    const existing = await db.query.jobPostings.findFirst({
      where: and(
        eq(jobPostings.orgId, session.orgId),
        sql`lower(trim(${jobPostings.title})) = ${normalizedTitle}`,
        sql`lower(trim(coalesce(${jobPostings.location}, ''))) = ${normalizedLocation}`,
        eq(jobPostings.type, normalizedType),
      ),
      columns: { id: true },
    });

    if (existing) {
      return err("A job posting with the same title, location, and type already exists.", 409);
    }

    const [job] = await db
      .insert(jobPostings)
      .values({
        orgId: session.orgId,
        title: body.title,
        departmentId: body.departmentId,
        hiringFlowId: body.hiringFlowId,
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
        status: body.status ?? "DRAFT",
        postedBy: session.user.id,
      })
      .returning();

    await invalidateCachePattern(`hr:jobs:list:${session.orgId}:*`);

    return ok(job, 201);
  });
}
