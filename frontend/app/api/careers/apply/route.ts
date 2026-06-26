import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings, candidates, candidateApplications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const applySchema = z.object({
  jobPostingId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional(),
  linkedinUrl: z.string().url().max(500).optional(),
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().max(500).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof applySchema>;
  try {
    const raw = await req.json();
    body = applySchema.parse(raw);
  } catch {
    return err("Invalid request body.", 400);
  }

  const { jobPostingId, name, email, phone, linkedinUrl, coverLetter, resumeUrl } = body;

  const [job] = await db
    .select({ id: jobPostings.id, orgId: jobPostings.orgId })
    .from(jobPostings)
    .where(and(eq(jobPostings.id, jobPostingId), eq(jobPostings.status, "OPEN")))
    .limit(1);

  if (!job) {
    return err("Job posting not found or is no longer accepting applications.", 404);
  }

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? name.trim();
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

  const [candidate] = await db
    .insert(candidates)
    .values({
      orgId: job.orgId,
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone: phone ?? null,
      linkedinUrl: linkedinUrl ?? null,
      resumeUrl: resumeUrl ?? null,
      source: "CAREERS_PAGE",
      status: "NEW",
    })
    .returning({ id: candidates.id });

  if (!candidate) {
    return err("Failed to create application. Please try again.", 500);
  }

  await db.insert(candidateApplications).values({
    orgId: job.orgId,
    candidateId: candidate.id,
    jobPostingId,
    status: "APPLIED",
    coverLetter: coverLetter ?? null,
  });

  return ok({ id: candidate.id }, 201);
}
