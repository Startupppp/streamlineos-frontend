import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings, candidates, candidateApplications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isValidPhoneNumber } from "libphonenumber-js";

const NAME_RE = /^[\p{L}][\p{L}\s.''-]{1,199}$/u;
const LINKEDIN_RE = /^https?:\/\/([\w-]+\.)?linkedin\.com\/.+/i;

const applySchema = z.object({
  jobPostingId: z.number().int().positive(),
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(200)
    .regex(NAME_RE, "Name contains unsupported characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  phone: z
    .string()
    .max(50)
    .optional()
    .refine((v) => !v || isValidPhoneNumber(v), {
      message: "Enter a valid phone number for the selected country.",
    }),
  linkedinUrl: z
    .string()
    .url()
    .max(500)
    .optional()
    .refine((v) => !v || LINKEDIN_RE.test(v), {
      message: "LinkedIn URL must be on linkedin.com.",
    }),
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z
    .string()
    .url()
    .max(500)
    .optional()
    .refine(
      (v) => {
        if (!v) return true;
        const allowed = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
        if (!allowed) return true;
        return v.startsWith(allowed);
      },
      { message: "Resume must be uploaded through this site." },
    ),
});

function firstErrorMessage(zerr: z.ZodError): string {
  return zerr.issues[0]?.message ?? "Invalid request body.";
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof applySchema>;
  try {
    const raw = await req.json();
    const parsed = applySchema.safeParse(raw);
    if (!parsed.success) {
      return err(firstErrorMessage(parsed.error), 400);
    }
    body = parsed.data;
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
    return err("This job is no longer accepting applications.", 404);
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
      email,
      phone: phone ?? null,
      linkedinUrl: linkedinUrl ?? null,
      resumeUrl: resumeUrl ?? null,
      source: "CAREERS_PAGE",
      status: "NEW",
    })
    .returning({ id: candidates.id });

  if (!candidate) {
    return err("Could not save your application. Please try again.", 500);
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
