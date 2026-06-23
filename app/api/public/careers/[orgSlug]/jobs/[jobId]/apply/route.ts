import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, jobPostings, candidates, candidateApplications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";

const applySchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(200).toLowerCase(),
  phone: z.string().max(50).optional(),
  linkedinUrl: z.string().url().max(500).optional(),
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().max(500).optional(),
});

type RouteContext = { params: Promise<{ orgSlug: string; jobId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const { orgSlug, jobId: jobIdStr } = await params;
  const jobId = Number(jobIdStr);
  if (!jobId) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });

  let body: z.infer<typeof applySchema>;
  try {
    body = applySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
    columns: { id: true, name: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const job = await db.query.jobPostings.findFirst({
    where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, org.id), eq(jobPostings.status, "OPEN")),
    columns: { id: true, title: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found or no longer accepting applications." }, { status: 404 });

  const nameParts = body.name.split(/\s+/);
  const firstName = nameParts[0] ?? body.name;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";
  const trackingToken = randomBytes(32).toString("hex");

  const [candidate] = await db
    .insert(candidates)
    .values({
      orgId: org.id,
      firstName,
      lastName,
      email: body.email,
      phone: body.phone ?? null,
      linkedinUrl: body.linkedinUrl ?? null,
      resumeUrl: body.resumeUrl ?? null,
      source: "CAREERS_PAGE",
      status: "NEW",
    })
    .onConflictDoNothing()
    .returning({ id: candidates.id });

  const candidateId = candidate?.id ?? (
    await db.query.candidates.findFirst({
      where: and(eq(candidates.email, body.email), eq(candidates.orgId, org.id)),
      columns: { id: true },
    })
  )?.id;

  if (!candidateId) {
    return NextResponse.json({ error: "Failed to process application." }, { status: 500 });
  }

  await db.insert(candidateApplications).values({
    orgId: org.id,
    candidateId,
    jobPostingId: jobId,
    status: "APPLIED",
    coverLetter: body.coverLetter ?? null,
    trackingToken,
  });

  return NextResponse.json({ trackingToken }, { status: 201 });
}
