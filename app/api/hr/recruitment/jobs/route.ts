import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";
import type { JobPostingStatus } from "@/types/hr";

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
    const status = req.nextUrl.searchParams.get("status") as JobPostingStatus | null;

    const conditions = [eq(jobPostings.orgId, session.orgId)];
    if (status) conditions.push(eq(jobPostings.status, status));

    const data = await db.query.jobPostings.findMany({
      where: and(...conditions),
      orderBy: [desc(jobPostings.createdAt)],
    });

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

    return ok(job);
  });
}
