import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";

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

    return ok(updated);
  });
}
