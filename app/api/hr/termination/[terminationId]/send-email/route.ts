import { withAdmin, err, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { terminations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendTerminationEmail } from "@/lib/email";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAdmin(async (session) => {
    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!Number.isFinite(terminationId) || terminationId <= 0) return err("Invalid ID.", 400);

    const record = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!record) return err("Not found.", 404);
    if (record.status !== "APPROVED") return err("CEO approval required before sending.", 400);

    const [employee, initiator] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, record.userId),
        columns: { id: true, name: true, email: true, designation: true },
      }),
      record.initiatedBy
        ? db.query.users.findFirst({
            where: eq(users.id, record.initiatedBy),
            columns: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    if (!employee?.email) return err("Employee email not found.", 400);

    const terminationDate = record.effectiveDate
      ? format(new Date(record.effectiveDate), "MMMM dd, yyyy")
      : "As communicated";

    await sendTerminationEmail(
      employee.email,
      employee.name ?? employee.email,
      employee.designation ?? "Employee",
      terminationDate,
      initiator?.name ?? "HR",
      record.reasons.join(", ")
    );

    await db
      .update(terminations)
      .set({
        status: "SENT",
        emailSentAt: new Date(),
        emailStatus: "sent",
        updatedAt: new Date(),
      })
      .where(eq(terminations.id, terminationId));

    // Deactivate the employee's account so they can no longer sign in
    await db.update(users).set({ isActive: false }).where(eq(users.id, record.userId));

    return ok({ success: true });
  });
}
