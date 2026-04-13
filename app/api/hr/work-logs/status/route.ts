import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema/projects";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendWorkLogStatusEmail } from "@/lib/email";

const patchWorkLogStatusSchema = z.object({
  id: z.number(),
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can approve or reject work logs.", 403);
    }

    const body = await parseBody(req, patchWorkLogStatusSchema);

    const existing = await db.query.timesheets.findFirst({
      where: and(
        eq(timesheets.id, body.id),
        eq(timesheets.orgId, session.orgId)
      ),
    });

    if (!existing) return err("Work log not found.", 404);

    const [updated] = await db
      .update(timesheets)
      .set({
        status: body.status,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectionReason:
          body.status === "REJECTED" ? body.rejectionReason ?? null : null,
      })
      .where(eq(timesheets.id, body.id))
      .returning();

    // Send email to the work log owner (non-blocking)
    if (existing.userId) {
      void (async () => {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, existing.userId!),
          columns: { email: true, name: true },
        });
        if (employee?.email) {
          await sendWorkLogStatusEmail(
            employee.email,
            employee.name ?? "Employee",
            existing.date,
            body.status,
            session.user.name ?? "Admin",
            body.rejectionReason
          );
        }
      })().catch(() => {});
    }

    return ok(updated);
  });
}
