import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { resignations, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { sendResignationSubmittedEmail } from "@/lib/email";
import { inngest } from "@/lib/inngest/client";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

const REASON_CATEGORIES = [
  "Better Opportunity", "Personal Reasons", "Higher Education",
  "Work Environment", "Compensation", "Role Mismatch",
  "Relocation", "Health Issues", "Starting Own Venture", "Other",
] as const;

const createSchema = z.object({
  reason: z.string().min(50, "Detailed reason must be at least 50 characters").max(2000),
  reasonCategory: z.enum(REASON_CATEGORIES),
  lastWorkingDate: z.string().min(1, "Last working date is required"),
  noticePeriodDays: z.number().int().min(0).max(180).optional().default(30),
  willingForExitInterview: z.boolean().optional().default(true),
  companyFeedback: z.string().max(2000).optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const conditions = [eq(resignations.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(resignations.userId, session.user.id));

    const data = await db.query.resignations.findMany({
      where: and(...conditions),
      with: { user: true, checklists: true, hrReviewer: true, ceoReviewer: true },
      orderBy: [desc(resignations.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createSchema.parse(await req.json());
    const [resignation] = await db.insert(resignations).values({
      orgId: session.orgId,
      userId: session.user.id,
      reason: body.reason,
      reasonCategory: body.reasonCategory,
      lastWorkingDate: body.lastWorkingDate,
      noticePeriodDays: body.noticePeriodDays,
      willingForExitInterview: body.willingForExitInterview,
      companyFeedback: body.companyFeedback || null,
      status: "PENDING_HR",
    }).returning();

    const adminMembers = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.orgId, session.orgId),
        inArray(organizationMembers.role, ["CEO", "HR"])
      ),
      with: { user: true },
    });

    const submittingUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    const submissionDate = format(new Date(), "dd MMM yyyy");
    const lastWorkingDate = format(new Date(body.lastWorkingDate), "dd MMM yyyy");

    for (const admin of adminMembers) {
      if (admin.user?.email && admin.user.email !== submittingUser?.email) {
        sendResignationSubmittedEmail(
          admin.user.email,
          admin.user.name ?? "HR",
          submittingUser?.name ?? "Employee",
          submittingUser?.designation ?? "N/A",
          submissionDate,
          lastWorkingDate,
          body.noticePeriodDays,
          body.reason
        ).catch(() => undefined);
      }
    }

    void inngest.send({
      name: "hr/resignation.submitted",
      data: {
        resignationId: resignation.id,
        orgId: session.orgId,
        employeeName: submittingUser?.name ?? "Employee",
        employeeId: session.user.id,
      },
    });

    return ok(resignation, 201);
  });
}
