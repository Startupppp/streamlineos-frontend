import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { terminations, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  reasons: z.array(z.string().min(1)).min(1, "At least one reason is required"),
  detailedExplanation: z.string().min(1, "Detailed explanation is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  severanceAmount: z.number().nonnegative().optional(),
  noticePeriodWaived: z.boolean().optional().default(false),
  internalNotes: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:employees"))  return err("Forbidden", 403);

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
      return err("Only HR can initiate terminations.", 403);
    }

    const body = createSchema.parse(await req.json());

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!membership) return err("Employee not found.", 404);
    if (body.userId === session.user.id) return err("You cannot terminate yourself.", 400);

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
        status: "DRAFT",
        initiatedBy: session.user.id,
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
