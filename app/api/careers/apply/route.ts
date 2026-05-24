import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  jobPostings,
  candidates,
  candidateApplications,
  users,
  organizationMembers,
} from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isValidPhoneNumber } from "libphonenumber-js";
import { sendNotification } from "@/lib/notifications/send";
import { sendApplicantConfirmationEmail, sendHrNewApplicationEmail } from "@/lib/email/careers";
import { logger } from "@/lib/logger";

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
    .select({
      id: jobPostings.id,
      orgId: jobPostings.orgId,
      title: jobPostings.title,
      location: jobPostings.location,
      postedBy: jobPostings.postedBy,
    })
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

  void notifyHrOfApplication({
    orgId: job.orgId,
    postedById: job.postedBy,
    jobId: job.id,
    jobTitle: job.title,
    jobLocation: job.location,
    candidateId: candidate.id,
    candidateName: `${firstName} ${lastName === "-" ? "" : lastName}`.trim(),
    candidateEmail: email,
    candidatePhone: phone ?? null,
    linkedinUrl: linkedinUrl ?? null,
    resumeUrl: resumeUrl ?? null,
    coverLetter: coverLetter ?? null,
  });

  void sendApplicantConfirmationEmail({
    to: email,
    name: firstName,
    jobTitle: job.title,
  }).catch((error) => {
    logger.error("Applicant confirmation dispatch failed", { error, candidateId: candidate.id });
  });

  return ok({ id: candidate.id }, 201);
}

async function notifyHrOfApplication(params: {
  orgId: string;
  postedById: string | null;
  jobId: number;
  jobTitle: string;
  jobLocation: string | null;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
}): Promise<void> {
  try {
    const hrMembers = await db
      .select({ userId: organizationMembers.userId, email: users.email })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(
        and(
          eq(organizationMembers.orgId, params.orgId),
          or(eq(organizationMembers.role, "HR"), eq(users.role, "HR")),
        ),
      );

    const recipientUserIds = new Set<string>();
    const recipientEmails = new Set<string>();
    for (const m of hrMembers) {
      recipientUserIds.add(m.userId);
      if (m.email) recipientEmails.add(m.email);
    }

    if (params.postedById && !recipientUserIds.has(params.postedById)) {
      const [poster] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, params.postedById))
        .limit(1);
      if (poster?.email) {
        recipientUserIds.add(params.postedById);
        recipientEmails.add(poster.email);
      }
    }

    const link = `/hr/recruitment/candidates/${params.candidateId}`;
    const title = `New application — ${params.jobTitle}`;
    const message = `${params.candidateName} applied for ${params.jobTitle}${
      params.jobLocation ? ` (${params.jobLocation})` : ""
    }.`;

    await Promise.allSettled(
      Array.from(recipientUserIds).map((userId) =>
        sendNotification({
          orgId: params.orgId,
          userId,
          type: "INFO",
          title,
          message,
          link,
          channel: "in_app",
          sound: true,
          metadata: { jobId: params.jobId, candidateId: params.candidateId, source: "CAREERS_PAGE" },
        }),
      ),
    );

    if (recipientEmails.size > 0) {
      await sendHrNewApplicationEmail({
        to: Array.from(recipientEmails),
        jobTitle: params.jobTitle,
        jobLocation: params.jobLocation,
        candidateName: params.candidateName,
        candidateEmail: params.candidateEmail,
        candidatePhone: params.candidatePhone,
        linkedinUrl: params.linkedinUrl,
        resumeUrl: params.resumeUrl,
        candidateId: params.candidateId,
        jobId: params.jobId,
        coverLetter: params.coverLetter,
      });
    }
  } catch (error) {
    logger.error("Failed to notify HR of new application", {
      error,
      candidateId: params.candidateId,
      jobId: params.jobId,
    });
  }
}
