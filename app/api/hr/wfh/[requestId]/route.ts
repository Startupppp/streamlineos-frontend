import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { wfhRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  return withAuth(async (session) => {
    const { requestId: id } = await params;
    const requestId = Number(id);
    if (!requestId) return err("Invalid request ID.", 400);

    const body = await req.json() as {
      status: "APPROVED" | "REJECTED";
      rejectionReason?: string;
    };

    if (!body.status || !["APPROVED", "REJECTED"].includes(body.status)) {
      return err("status must be APPROVED or REJECTED.", 400);
    }

    const existing = await db.query.wfhRequests.findFirst({
      where: and(eq(wfhRequests.id, requestId), eq(wfhRequests.orgId, session.orgId)),
    });

    if (!existing) return err("WFH request not found.", 404);

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
