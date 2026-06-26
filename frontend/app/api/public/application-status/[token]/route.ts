import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { candidateApplications, candidates, jobPostings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const application = await db.query.candidateApplications.findFirst({
    where: eq(candidateApplications.trackingToken, token),
    with: {
      candidate: { columns: { firstName: true, lastName: true, email: true } },
      jobPosting: { columns: { title: true, location: true, type: true } },
    },
  });

  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  return NextResponse.json({
    status: application.status,
    appliedAt: application.appliedAt,
    updatedAt: application.updatedAt,
    job: application.jobPosting,
    candidate: application.candidate,
  });
}
