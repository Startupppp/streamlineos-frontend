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
const CANDIDATE_SOURCES = ["LINKEDIN", "NAUKRI", "INDEED", "REFERRAL", "CAREERS_PAGE", "DIRECT"] as const;

const updateCandidateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  linkedinUrl: z.string().url().max(500).optional().or(z.literal("")),
  portfolioUrl: z.string().url().max(500).optional().or(z.literal("")),
  currentCompany: z.string().max(200).optional(),
  currentRole: z.string().max(200).optional(),
  experienceYears: z.string().optional(),
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

    await db
      .update(candidates)
      .set({
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl || null }),
        ...(body.portfolioUrl !== undefined && { portfolioUrl: body.portfolioUrl || null }),
        ...(body.currentCompany !== undefined && { currentCompany: body.currentCompany }),
        ...(body.currentRole !== undefined && { currentRole: body.currentRole }),
        ...(body.experienceYears !== undefined && { experienceYears: body.experienceYears }),
        ...(body.skills !== undefined && { skills: body.skills }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.rating !== undefined && { rating: body.rating }),
        ...(body.resumeUrl !== undefined && { resumeUrl: body.resumeUrl || null }),
        updatedAt: new Date(),
      })
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
