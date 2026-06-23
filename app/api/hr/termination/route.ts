import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { terminations, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, notInArray } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import { TERMINATION_REASON_OTHER, TERMINATION_REASONS } from "@/lib/constants/hr-separation";
import type { NextRequest } from "next/server";

const VALID_REASONS = TERMINATION_REASONS as readonly string[];

const createSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  reasons: z
    .array(z.string().min(1))
    .min(1, "A termination reason is required")
    .max(1, "Only one reason may be selected"),
  detailedExplanation: z.string().optional().default(""),
  effectiveDate: z.string().min(1, "Effective date is required"),
  severanceAmount: z.number().nonnegative().optional(),
  noticePeriodWaived: z.boolean().optional().default(false),
  internalNotes: z.string().optional(),
}).superRefine((data, ctx) => {
  const reason = data.reasons[0];
  if (reason && !VALID_REASONS.includes(reason)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid termination reason",
      path: ["reasons"],
    });
  }

  if (reason === TERMINATION_REASON_OTHER) {
    const remarks = data.detailedExplanation ?? "";
    if (remarks.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Remarks for 'Other' reason must be at least 10 characters",
        path: ["detailedExplanation"],
      });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effective = new Date(data.effectiveDate);
  effective.setHours(0, 0, 0, 0);
  if (effective < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Effective date must be today or a future date",
      path: ["effectiveDate"],
    });
  }
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (session.user.role !== "HR" && session.user.role !== "CEO" && !ability.can("manage", "hr:employees")) {
      return err("Forbidden", 403);
    }

    const rows = await db
      .select({
        id: terminations.id,
        orgId: terminations.orgId,
        userId: terminations.userId,
        status: terminations.status,
        reasons: terminations.reasons,
        detailedExplanation: terminations.detailedExplanation,
        effectiveDate: terminations.effectiveDate,
        severanceAmount: terminations.severanceAmount,
        noticePeriodWaived: terminations.noticePeriodWaived,
        internalNotes: terminations.internalNotes,
        createdAt: terminations.createdAt,
        updatedAt: terminations.updatedAt,
        ceoRemarks: terminations.ceoRemarks,
        ceoReviewedBy: terminations.ceoReviewedBy,
        ceoReviewedAt: terminations.ceoReviewedAt,
        emailSentAt: terminations.emailSentAt,
        emailStatus: terminations.emailStatus,
        initiatedBy: terminations.initiatedBy,
        employee: {
          id: users.id,
          name: users.name,
          email: users.email,
          designation: users.designation,
          employeeId: users.employeeId,
        },
      })
      .from(terminations)
      .leftJoin(users, eq(terminations.userId, users.id))
      .where(eq(terminations.orgId, session.orgId))
      .orderBy(desc(terminations.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (session.user.role !== "HR" && session.user.role !== "CEO") {
      return err("Only HR or CEO can initiate terminations.", 403);
    }

    const body = createSchema.parse(await req.json());

    if (body.userId === session.user.id) return err("You cannot terminate yourself.", 400);

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!membership) return err("Employee not found.", 404);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
      columns: { id: true, isActive: true },
    });
    if (!targetUser) return err("Employee not found.", 404);

    if (membership.role === "CEO" || membership.isOwner) {
      return err("CEO cannot be terminated through this workflow.", 400);
    }

    if (!targetUser.isActive) {
      return err("This employee has already been terminated or is inactive.", 400);
    }

    const existingActive = await db.query.terminations.findFirst({
      where: and(
        eq(terminations.userId, body.userId),
        eq(terminations.orgId, session.orgId),
        notInArray(terminations.status, ["REJECTED"])
      ),
      columns: { id: true, status: true },
    });
    if (existingActive) {
      const statusLabel =
        existingActive.status === "COMPLETED"
          ? "completed"
          : existingActive.status === "PENDING_CEO"
            ? "pending CEO review"
            : existingActive.status === "APPROVED"
              ? "approved"
              : existingActive.status === "SENT"
                ? "in progress (email sent)"
                : "in draft";
      return err(`This employee already has an active termination record (${statusLabel}). Only one active termination is allowed at a time.`, 409);
    }

    const isCeoInitiator = session.user.role === "CEO";
    const now = new Date();
    const [record] = await db
      .insert(terminations)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        reasons: body.reasons,
        detailedExplanation: body.detailedExplanation,
        effectiveDate: body.effectiveDate,
        severanceAmount: body.severanceAmount !== undefined ? body.severanceAmount.toString() : undefined,
        noticePeriodWaived: body.noticePeriodWaived,
        internalNotes: body.internalNotes,
        status: isCeoInitiator ? "APPROVED" : "DRAFT",
        initiatedBy: session.user.id,
        ...(isCeoInitiator && { ceoReviewedBy: session.user.id, ceoReviewedAt: now }),
      })
      .returning();

    void writeAuditLog({
      action: "TERMINATION_CREATED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(record.id),
      targetType: "termination",
      metadata: { employeeId: body.userId, reasons: body.reasons },
    }).catch(() => undefined);

    return ok(record, 201);
  });
}
