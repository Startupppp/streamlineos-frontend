import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewBookingLinks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { linkId: id } = await params;
    const linkId = Number(id);
    if (!linkId) return err("Invalid link ID.", 400);

    const existing = await db.query.interviewBookingLinks.findFirst({
      where: and(
        eq(interviewBookingLinks.id, linkId),
        eq(interviewBookingLinks.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Booking link not found.", 404);

    await db
      .update(interviewBookingLinks)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(interviewBookingLinks.id, linkId));

    return ok({ success: true });
  });
}
