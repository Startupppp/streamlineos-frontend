import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, jobPostings } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

type RouteContext = { params: Promise<{ orgSlug: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { orgSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
    columns: { id: true, name: true, logo: true, industry: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const jobs = await db
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      location: jobPostings.location,
      type: jobPostings.type,
      experience: jobPostings.experience,
      salaryMin: jobPostings.salaryMin,
      salaryMax: jobPostings.salaryMax,
      openings: jobPostings.openings,
      applicationDeadline: jobPostings.applicationDeadline,
      createdAt: jobPostings.createdAt,
    })
    .from(jobPostings)
    .where(and(eq(jobPostings.orgId, org.id), eq(jobPostings.status, "OPEN")))
    .orderBy(desc(jobPostings.createdAt));

  return NextResponse.json({ org, jobs }, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
  });
}
