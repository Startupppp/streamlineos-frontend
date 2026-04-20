import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  candidates,
  candidateApplications,
  organizations,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { getCandidateRejectionEmail } from "@/lib/email-templates/hr";
import { writeAuditLog } from "@/lib/db/audit";
import type { NextRequest } from "next/server";

const bulkRejectSchema = z.object({
  candidateIds: z
    .array(z.number().int().positive())
    .min(1, "Provide at least one candidate ID")
    .max(100, "Cannot reject more than 100 candidates at once"),
  sendRejectionEmail: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden: HR/Admin role required", 403);
    }

    const body = await parseBody(req, bulkRejectSchema);
    const { candidateIds, sendRejectionEmail } = body;

    const existing = await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        status: candidates.status,
      })
      .from(candidates)
      .where(
        and(
          inArray(candidates.id, candidateIds),
          eq(candidates.orgId, session.orgId)
        )
      );

    if (existing.length === 0) {
      return err("No matching candidates found", 404);
    }

    const toReject = existing.filter((c) => c.status !== "REJECTED");
    const alreadyRejected = existing.length - toReject.length;

    if (toReject.length === 0) {
      return ok({ rejected: 0, alreadyRejected, emailsSent: 0 });
    }

    const toRejectIds = toReject.map((c) => c.id);

    await db
      .update(candidates)
      .set({ status: "REJECTED", updatedAt: new Date() })
      .where(inArray(candidates.id, toRejectIds));

    void Promise.all(
      toReject.map((c) =>
        writeAuditLog({
          action: "CANDIDATE_STAGE_CHANGED",
          userId: session.user.id,
          orgId: session.orgId,
          targetId: String(c.id),
          targetType: "candidate",
          metadata: {
            from: c.status,
            to: "REJECTED",
            candidateName: `${c.firstName} ${c.lastName}`,
            bulk: true,
          },
        }).catch(() => undefined)
      )
    );

    let emailsSent = 0;

    if (sendRejectionEmail) {
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, session.orgId))
        .limit(1);

      const companyName = org?.name ?? "our company";

      const latestApps = await db
        .select({
          candidateId: candidateApplications.candidateId,
          jobTitle: candidateApplications.candidateId,
        })
        .from(candidateApplications)
        .where(inArray(candidateApplications.candidateId, toRejectIds));

      const jobTitleMap: Record<number, string> = {};
      for (const app of latestApps) {
        jobTitleMap[app.candidateId] ??= "the position";
      }

      const emailPromises = toReject.map(async (candidate) => {
        if (!candidate.email) return;
        try {
          const { subject, html } = getCandidateRejectionEmail({
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: jobTitleMap[candidate.id] ?? "the position",
            companyName,
            senderName: session.user.name ?? undefined,
          });
          await sendEmail({ to: candidate.email, subject, html });
          emailsSent++;
        } catch {
        }
      });

      await Promise.allSettled(emailPromises);
    }

    return ok({
      rejected: toReject.length,
      alreadyRejected,
      emailsSent,
    });
  });
}
