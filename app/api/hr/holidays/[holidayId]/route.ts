import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const patchHolidaySchema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().optional(),
  type: z.enum(["NATIONAL", "PUBLIC", "OPTIONAL"]).optional(),
  message: z.string().optional(),
  isPublic: z.boolean().optional(),
  isHalfDay: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ holidayId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can update holidays.", 403);
    }

    const { holidayId: id } = await params;
    const holidayId = Number(id);
    if (!holidayId) return err("Invalid holiday ID.", 400);

    const existing = await db.query.holidays.findFirst({
      where: and(eq(holidays.id, holidayId), eq(holidays.orgId, session.orgId)),
    });
    if (!existing) return err("Holiday not found.", 404);

    const body = await parseBody(req, patchHolidaySchema);
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.date !== undefined) patch.date = body.date;
    if (body.type !== undefined) patch.type = body.type;
    if (body.message !== undefined) patch.message = body.message;
    if (body.isPublic !== undefined) patch.isPublic = body.isPublic;
    if (body.isHalfDay !== undefined) patch.isHalfDay = body.isHalfDay;

    const [updated] = await db
      .update(holidays)
      .set(patch)
      .where(eq(holidays.id, holidayId))
      .returning();

    return ok(updated);
  });
}

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
