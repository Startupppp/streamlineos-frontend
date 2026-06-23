import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ orgSlug: string; jobId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { orgSlug, jobId: jobIdStr } = await params;
  const jobId = Number(jobIdStr);
  if (!jobId) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
    columns: { id: true, name: true, logo: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const job = await db.query.jobPostings.findFirst({
    where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, org.id), eq(jobPostings.status, "OPEN")),
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  return NextResponse.json({ org, job });
}
