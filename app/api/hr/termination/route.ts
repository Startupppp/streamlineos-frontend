import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { terminations, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  reasons: z.array(z.string().min(1)).min(1, "At least one reason is required"),
  detailedExplanation: z.string().min(1, "Detailed explanation is required"),
  effectiveDate: z.string().min(1, "effectiveDate is required"),
  severanceAmount: z.number().nonnegative().optional(),
  noticePeriodWaived: z.boolean().optional().default(false),
  internalNotes: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  return withAdmin(async (session) => {
    const rows = await db
      .select({
        id: terminations.id,
        status: terminations.status,
        reasons: terminations.reasons,
        effectiveDate: terminations.effectiveDate,
        createdAt: terminations.createdAt,
        ceoRemarks: terminations.ceoRemarks,
        emailSentAt: terminations.emailSentAt,
        employee: {
          id: users.id,
          name: users.name,
          email: users.email,
          designation: users.designation,
          employeeId: users.employeeId,
        },
      })
      .from(terminations)
      .innerJoin(users, eq(terminations.userId, users.id))
      .where(eq(terminations.orgId, session.orgId))
      .orderBy(desc(terminations.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = createSchema.parse(await req.json());

    // Verify the target user is a member of this org
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

    return ok(record, 201);
  });
}
