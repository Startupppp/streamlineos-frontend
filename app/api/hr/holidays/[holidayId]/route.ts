import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ holidayId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can delete holidays.", 403);
    }

    const { holidayId: id } = await params;
    const holidayId = Number(id);
    if (!holidayId) return err("Invalid holiday ID.", 400);

    const existing = await db.query.holidays.findFirst({
      where: and(eq(holidays.id, holidayId), eq(holidays.orgId, session.orgId)),
    });

    if (!existing) return err("Holiday not found.", 404);

    await db.delete(holidays).where(eq(holidays.id, holidayId));
    return ok({ success: true });
  });
}
