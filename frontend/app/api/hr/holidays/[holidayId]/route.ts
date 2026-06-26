import { withAuth, ok, err, parseBody } from "@/lib/api/helpers"; 
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "Name must contain at least one letter")
    .refine((v) => !/\s{2,}/.test(v), "Name cannot have consecutive spaces"),
  date: z.string().min(1, "Date is required"),
  message: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ holidayId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:attendance")) {
      return err("Only admins can update holidays.", 403);
    }

    const { holidayId: id } = await params;
    const holidayId = Number(id);
    if (!holidayId) return err("Invalid holiday ID.", 400);

    const body = await parseBody(req, updateSchema);

    const existing = await db.query.holidays.findFirst({
      where: and(eq(holidays.id, holidayId), eq(holidays.orgId, session.orgId)),
    });

    if (!existing) return err("Holiday not found.", 404);

    const [updated] = await db
      .update(holidays)
      .set({ name: body.name.trim(), date: body.date, message: body.message?.trim() ?? null })
      .where(and(eq(holidays.id, holidayId), eq(holidays.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ holidayId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:attendance")) {
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
