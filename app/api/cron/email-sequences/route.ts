import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSequenceEnrollments, emailSequenceSteps, candidates } from "@/lib/db/schema";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;

  const dupeCheck = await cronIdempotencyCheck("email-sequences");
  if (dupeCheck) return dupeCheck;

  try {
    const now = new Date();

    const dueEnrollments = await db.query.emailSequenceEnrollments.findMany({
      where: and(
        eq(emailSequenceEnrollments.status, "ACTIVE"),
        isNotNull(emailSequenceEnrollments.nextSendAt),
        lte(emailSequenceEnrollments.nextSendAt, now)
      ),
      with: {
        sequence: { with: { steps: { orderBy: (s, { asc }) => [asc(s.stepOrder)] } } },
        candidate: { columns: { id: true, email: true, firstName: true, lastName: true } },
      },
      limit: 100,
    });

    let sent = 0;
    let completed = 0;

    for (const enrollment of dueEnrollments) {
      const steps = enrollment.sequence.steps;
      const currentStep = steps[enrollment.currentStep];

      if (!currentStep) {
        await db.update(emailSequenceEnrollments)
          .set({ status: "COMPLETED", completedAt: now })
          .where(eq(emailSequenceEnrollments.id, enrollment.id));
        completed++;
        continue;
      }

      const candidateName = `${enrollment.candidate.firstName} ${enrollment.candidate.lastName}`.trim();

      try {
        await sendEmail({
          to: enrollment.candidate.email,
          subject: currentStep.subject,
          html: currentStep.htmlBody.replace(/\{\{candidate_name\}\}/g, candidateName),
        });
        sent++;
      } catch (emailError) {
        logger.error("Failed to send sequence email", { enrollmentId: enrollment.id, error: emailError });
        continue;
      }

      const nextStepIndex = enrollment.currentStep + 1;
      const nextStep = steps[nextStepIndex];

      if (!nextStep) {
        await db.update(emailSequenceEnrollments)
          .set({ status: "COMPLETED", completedAt: now, currentStep: nextStepIndex })
          .where(eq(emailSequenceEnrollments.id, enrollment.id));
        completed++;
      } else {
        const nextSendAt = new Date(now.getTime() + nextStep.delayDays * 86_400_000);
        await db.update(emailSequenceEnrollments)
          .set({ currentStep: nextStepIndex, nextSendAt })
          .where(eq(emailSequenceEnrollments.id, enrollment.id));
      }
    }

    return NextResponse.json({ success: true, sent, completed, total: dueEnrollments.length });
  } catch (error) {
    logger.error("Email sequences cron failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
