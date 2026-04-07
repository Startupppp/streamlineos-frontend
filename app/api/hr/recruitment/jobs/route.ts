import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import type { JobPostingStatus } from "@/types/hr";

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
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create job postings.", 403);
    }

    const body = await req.json() as {
      title: string;
      departmentId?: number;
      location?: string;
      type?: string;
      experience?: string;
      salaryMin?: number;
      salaryMax?: number;
      description?: string;
      requirements?: string;
      benefits?: string;
      openings?: number;
      applicationDeadline?: string;
    };

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
