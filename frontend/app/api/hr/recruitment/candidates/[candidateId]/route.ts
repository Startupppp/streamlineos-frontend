import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateSlaTracking, candidateApplications, interviews, organizations } from "@/lib/db/schema";
import { eq, and, ne, ilike } from "drizzle-orm";
import { z } from "zod";
import { getCandidateRejectionEmail } from "@/lib/email-templates/hr";
import { sendEmail } from "@/lib/email";
import { notifyByRoles } from "@/server/actions/create-notification";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const [candidate, slaRecords] = await Promise.all([
      db.query.candidates.findFirst({
        where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
        with: {
          applications: { with: { jobPosting: true } },
          interviews: {
            with: {
              scorecards: true,
              interviewer: { columns: { id: true, firstName: true, lastName: true, email: true, image: true } },
            },
            orderBy: (t, { desc }) => [desc(t.scheduledAt)],
          },
        },
      }),
      db.query.candidateSlaTracking.findMany({
        where: and(
          eq(candidateSlaTracking.candidateId, candidateId),
          eq(candidateSlaTracking.orgId, session.orgId)
        ),
        orderBy: (t, { asc }) => [asc(t.stage)],
      }),
    ]);

    if (!candidate) return err("Candidate not found.", 404);

    return ok({ ...candidate, slaTracking: slaRecords });
  });
}

const CANDIDATE_STATUSES = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;
const CANDIDATE_SOURCES = ["LINKEDIN", "NAUKRI", "INDEED", "REFERRAL", "CAREERS_PAGE", "DIRECT", "JOB_PORTAL", "CAMPUS"] as const;

const updateCandidateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  linkedinUrl: z.string().url().max(500).optional().or(z.literal("")),
  portfolioUrl: z.string().url().max(500).optional().or(z.literal("")),
  currentCompany: z.string().max(200).optional(),
  currentRole: z.string().max(200).optional(),
  experienceYears: z.number().min(0, "Cannot be negative").max(50, "Cannot exceed 50 years").optional(),
  skills: z.array(z.string()).optional(),
  source: z.enum(CANDIDATE_SOURCES).optional(),
  status: z.enum(CANDIDATE_STATUSES).optional(),
  notes: z.string().max(5000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  resumeUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const existing = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!existing) return err("Candidate not found.", 404);

    const body = await parseBody(req, updateCandidateSchema);

    if (body.email && body.email !== existing.email) {
      const emailConflict = await db.query.candidates.findFirst({
        where: and(
          eq(candidates.orgId, session.orgId),
          ilike(candidates.email, body.email.trim()),
          ne(candidates.id, candidateId),
        ),
        columns: { id: true },
      });
      if (emailConflict) {
        return err("A candidate with this email already exists in your organization.", 409);
      }
    }

    if (body.status && body.status !== existing.status) {
      const VALID_TRANSITIONS: Record<string, string[]> = {
        NEW: ["SCREENING", "REJECTED"],
        SCREENING: ["NEW", "INTERVIEW", "REJECTED"],
        INTERVIEW: ["SCREENING", "OFFER", "REJECTED"],
        OFFER: ["INTERVIEW", "HIRED", "REJECTED"],
        HIRED: [],
        REJECTED: ["SCREENING"],
      };
      const allowed = VALID_TRANSITIONS[existing.status ?? "NEW"] ?? [];
      if (!allowed.includes(body.status)) {
        return err(
          `Cannot move candidate from ${existing.status} to ${body.status}. ${
            existing.status === "REJECTED"
              ? "A rejected candidate must be re-opened to Screening first."
              : existing.status === "HIRED"
              ? "Hired candidates cannot change status."
              : `Allowed next statuses: ${allowed.join(", ") || "none"}.`
          }`,
          422
        );
      }
    }

    const updateFields: Parameters<ReturnType<typeof db.update<typeof candidates>>["set"]>[0] = {
      updatedAt: new Date(),
    };
    if (body.firstName !== undefined) updateFields.firstName = body.firstName;
    if (body.lastName !== undefined) updateFields.lastName = body.lastName;
    if (body.email !== undefined) updateFields.email = body.email;
    if (body.phone !== undefined) updateFields.phone = body.phone;
    if (body.linkedinUrl !== undefined) updateFields.linkedinUrl = body.linkedinUrl || null;
    if (body.portfolioUrl !== undefined) updateFields.portfolioUrl = body.portfolioUrl || null;
    if (body.currentCompany !== undefined) updateFields.currentCompany = body.currentCompany;
    if (body.currentRole !== undefined) updateFields.currentRole = body.currentRole;
    if (body.experienceYears !== undefined) updateFields.experienceYears = String(body.experienceYears);
    if (body.skills !== undefined) updateFields.skills = body.skills;
    if (body.source !== undefined) updateFields.source = body.source;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.notes !== undefined) updateFields.notes = body.notes;
    if (body.rating !== undefined) updateFields.rating = body.rating;
    if (body.resumeUrl !== undefined) updateFields.resumeUrl = body.resumeUrl || null;

    await db
      .update(candidates)
      .set(updateFields)
      .where(eq(candidates.id, candidateId));

    if (body.status === "REJECTED" && existing.status !== "REJECTED") {
      const emailTarget = body.email ?? existing.email;

      void notifyByRoles(session.orgId, ["HR_MANAGER", "CEO", "HR"], {
        type: "INFO",
        title: "Candidate Rejected",
        message: `${existing.firstName} ${existing.lastName} has been moved to Rejected.`,
        link: `/hr/recruitment/candidates/${candidateId}`,
        metadata: { candidateId, stage: "REJECTED" },
      });

      if (emailTarget) {
         try {
            const [latestApp, org] = await Promise.all([
              db.query.candidateApplications.findFirst({
                where: eq(candidateApplications.candidateId, candidateId),
                with: { jobPosting: true },
                orderBy: (t, { desc }) => [desc(t.appliedAt)],
              }),
              db.query.organizations.findFirst({ where: eq(organizations.id, session.orgId) }),
            ]);
            const { subject, html } = getCandidateRejectionEmail({
              candidateName: `${existing.firstName} ${existing.lastName}`,
              jobTitle: latestApp?.jobPosting?.title ?? "the position",
              companyName: org?.name ?? "our company",
            });
            await sendEmail({ to: emailTarget, subject, html });
          } catch {
          }
   
      }
    }

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const existing = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!existing) return err("Candidate not found.", 404);

    await db.delete(candidateSlaTracking).where(eq(candidateSlaTracking.candidateId, candidateId));
    await db.delete(interviews).where(eq(interviews.candidateId, candidateId));
    await db.delete(candidateApplications).where(eq(candidateApplications.candidateId, candidateId));
    await db.delete(candidates).where(and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)));

    return ok({ success: true });
  });
}
