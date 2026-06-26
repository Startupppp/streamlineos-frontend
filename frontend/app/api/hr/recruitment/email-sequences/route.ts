import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailSequences, emailSequenceSteps } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const stepSchema = z.object({
  stepOrder: z.number().int().min(0),
  delayDays: z.number().int().min(0).default(0),
  subject: z.string().min(1).max(500).trim(),
  htmlBody: z.string().min(1),
});

const createSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional().default(true),
  triggerType: z.enum(["MANUAL", "CANDIDATE_ADDED", "APPLICATION_RECEIVED", "STAGE_CHANGED", "OFFER_SENT"]).default("MANUAL"),
  targetAudience: z.record(z.string(), z.unknown()).optional().default({}),
  steps: z.array(stepSchema).optional().default([]),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const data = await db.query.emailSequences.findMany({
      where: eq(emailSequences.orgId, session.orgId),
      with: {
        steps: { orderBy: (s, { asc }) => [asc(s.stepOrder)] },
        enrollments: { columns: { id: true, status: true } },
        creator: { columns: { id: true, name: true } },
      },
      orderBy: [desc(emailSequences.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, createSchema);

    const [sequence] = await db.insert(emailSequences).values({
      orgId: session.orgId,
      name: body.name,
      description: body.description,
      isActive: body.isActive ?? true,
      triggerType: body.triggerType,
      targetAudience: body.targetAudience ?? {},
      createdBy: session.user.id,
    }).returning();

    if (body.steps.length > 0) {
      await db.insert(emailSequenceSteps).values(
        body.steps.map((step) => ({
          sequenceId: sequence.id,
          stepOrder: step.stepOrder,
          delayDays: step.delayDays,
          subject: step.subject,
          htmlBody: step.htmlBody,
        }))
      );
    }

    const created = await db.query.emailSequences.findFirst({
      where: eq(emailSequences.id, sequence.id),
      with: { steps: { orderBy: (s, { asc }) => [asc(s.stepOrder)] } },
    });

    return ok(created, 201);
  });
}
