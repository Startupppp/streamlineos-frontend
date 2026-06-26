import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateApplications, jobPostings, organizations, candidateSlaTracking } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import { notifyByRoles } from "@/server/actions/create-notification";
import { getCandidateRejectionEmail } from "@/lib/email-templates/hr";
import { sendEmail } from "@/lib/email";
import type { NextRequest } from "next/server";

const CANDIDATE_STAGES = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;
type CandidateStage = (typeof CANDIDATE_STAGES)[number];

const ALLOWED_TRANSITIONS: Record<CandidateStage, CandidateStage[]> = {
  NEW: ["SCREENING", "REJECTED"],
  SCREENING: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFER", "REJECTED"],
  OFFER: ["HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: ["SCREENING"],
};

const stageSchema = z.object({
  stage: z.enum(CANDIDATE_STAGES),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: rawId } = await params;
    const candidateId = Number(rawId);
    if (!candidateId || isNaN(candidateId)) return err("Invalid candidate ID.", 400);

    const body = await parseBody(req, stageSchema);
    const newStage: CandidateStage = body.stage;

    const existing = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!existing) return err("Candidate not found.", 404);

    if (existing.status === newStage) {
      return ok({ id: candidateId, stage: newStage, changed: false });
    }

    const currentStage = existing.status as CandidateStage;
    const allowed = ALLOWED_TRANSITIONS[currentStage] ?? [];
    if (!allowed.includes(newStage)) {
      return err(
        `Cannot move candidate from ${currentStage} to ${newStage}. ${currentStage === "REJECTED" ? "Rejected candidates must be re-opened to Screening first." : `Valid transitions from ${currentStage}: ${allowed.join(", ") || "none"}.`}`,
        422,
      );
    }

    const [updated] = await db
      .update(candidates)
      .set({ status: newStage, updatedAt: new Date() })
      .where(eq(candidates.id, candidateId))
      .returning();

    void writeAuditLog({
      action: "CANDIDATE_STAGE_CHANGED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(candidateId),
      targetType: "candidate",
      metadata: {
        from: existing.status,
        to: newStage,
        candidateName: `${existing.firstName} ${existing.lastName}`,
      },
    });

    if (newStage === "REJECTED") {
      void notifyByRoles(session.orgId, ["HR_MANAGER", "CEO", "HR"], {
        type: "INFO",
        title: "Candidate Rejected",
        message: `${existing.firstName} ${existing.lastName} has been moved to Rejected.`,
        link: `/hr/recruitment/candidates/${candidateId}`,
        metadata: { candidateId, stage: newStage },
      });

      if (existing.email) {
        void (async () => {
          try {
            const [latestApp, org] = await Promise.all([
              db.query.candidateApplications.findFirst({
                where: eq(candidateApplications.candidateId, candidateId),
                with: { jobPosting: true },
                orderBy: (t, { desc }) => [desc(t.appliedAt)],
              }),
              db.query.organizations.findFirst({ where: eq(organizations.id, session.orgId) }),
            ]);
            const jobPosting = latestApp?.jobPosting ?? null;
            const { subject, html } = getCandidateRejectionEmail({
              candidateName: `${existing.firstName} ${existing.lastName}`,
              jobTitle: jobPosting?.title ?? "the position",
              companyName: org?.name ?? "our company",
            });
            await sendEmail({ to: existing.email!, subject, html });
          } catch {
          }
        })();
      }
    }

    void db
      .insert(candidateSlaTracking)
      .values({
        orgId: session.orgId,
        candidateId,
        stage: newStage,
        enteredAt: new Date(),
        breachedAt: null,
        status: "ON_TRACK",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [candidateSlaTracking.candidateId, candidateSlaTracking.stage],
        set: {
          enteredAt: new Date(),
          breachedAt: null,
          status: "ON_TRACK",
          updatedAt: new Date(),
        },
      })
      .catch(() => undefined);

    void import("@/lib/services/automation/engine").then(({ runAutomationsForEvent }) =>
      runAutomationsForEvent(session.orgId, "candidate.stage_changed", {
        candidateId,
        candidateName: `${existing.firstName} ${existing.lastName}`,
        candidateEmail: existing.email ?? "",
        previousStatus: existing.status,
        newStatus: newStage,
      })
    );

    return ok({
      id: updated.id,
      stage: updated.status,
      changed: true,
    });
  });
}
