import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { terminations, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendTerminationEmail } from "@/lib/email";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    if (session.user.role !== "HR" && session.user.role !== "CEO") {
      return err("Only HR can send termination emails.", 403);
    }

    const { id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const existing = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
      with: { user: true },
    });
    if (!existing) return err("Termination not found.", 404);
    if (existing.status !== "APPROVED") return err("Termination must be CEO-approved before sending.", 400);

    const employee = existing.user;
    if (!employee?.email) return err("Employee email not found.", 400);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.orgId),
    });

    try {
      await sendTerminationEmail(
        employee.email,
        employee.name ?? "Employee",
        employee.designation ?? "N/A",
        existing.effectiveDate ? format(new Date(existing.effectiveDate), "dd MMM yyyy") : "N/A",
        session.user.name ?? "HR",
        existing.reasons?.join(", ") ?? ""
      );

      await db.update(terminations).set({
        status: "SENT",
        emailSentAt: new Date(),
        emailStatus: "sent",
        updatedAt: new Date(),
      }).where(eq(terminations.id, terminationId));

      return ok({ success: true });
    } catch {
      await db.update(terminations).set({
        emailStatus: "failed",
        updatedAt: new Date(),
      }).where(eq(terminations.id, terminationId));

      return err("Failed to send email.", 500);
    }
  });
}
