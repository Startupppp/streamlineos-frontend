import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { wfhRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const updateWfhSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  return withAuth(async (session) => {
    const { requestId: id } = await params;
    const requestId = Number(id);
    if (!requestId) return err("Invalid request ID.", 400);

    const body = await parseBody(req, updateWfhSchema);

    const existing = await db.query.wfhRequests.findFirst({
      where: and(eq(wfhRequests.id, requestId), eq(wfhRequests.orgId, session.orgId)),
    });

    if (!existing) return err("WFH request not found.", 404);

    if (session.user.id === existing.userId) {
      return err("You cannot act on your own WFH request.", 403);
    }

    if (
      session.user.id !== existing.approverId &&
      !isAdminOrOwner(session.user.role)
    ) {
      return err("You are not authorized to act on this WFH request.", 403);
    }

    await db
      .update(wfhRequests)
      .set({
        status: body.status,
        rejectionReason: body.status === "REJECTED" ? body.rejectionReason : null,
        approverId: session.user.id,
      })
      .where(eq(wfhRequests.id, requestId));

    return ok({ success: true });
  });
}
