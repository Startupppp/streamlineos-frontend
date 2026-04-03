import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can approve or reject work logs.", 403);
    }

    const body = await req.json() as {
      id: number;
      status: "APPROVED" | "REJECTED";
      rejectionReason?: string;
    };

    if (!body.id || !body.status) {
      return err("id and status are required.", 400);
    }

    if (!["APPROVED", "REJECTED"].includes(body.status)) {
      return err("status must be APPROVED or REJECTED.", 400);
    }

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
