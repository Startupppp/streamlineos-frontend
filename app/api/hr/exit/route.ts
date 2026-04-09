import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { resignations, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { sendResignationSubmittedEmail } from "@/lib/email";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(2000),
  lastWorkingDate: z.string().min(1, "Last working date is required"),
  noticePeriodDays: z.number().int().min(0).max(180).optional().default(30),
});

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const conditions = [eq(resignations.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(resignations.userId, session.user.id));

    const data = await db.query.resignations.findMany({
      where: and(...conditions),
      with: { user: true, checklists: true },
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
      lastWorkingDate: body.lastWorkingDate,
      noticePeriodDays: body.noticePeriodDays,
      status: "SUBMITTED",
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

    return ok(resignation, 201);
  });
}
