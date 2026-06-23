import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { recruitmentVendors } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ vendorId: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  feePercent: z.number().min(0).max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

function isHrRole(role: string) {
  return ["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    if (!isHrRole(session.user.role ?? "")) return err("Forbidden", 403);
    const { vendorId } = await params;
    const id = Number(vendorId);
    if (!Number.isFinite(id)) return err("Invalid vendor ID", 400);

    const existing = await db.query.recruitmentVendors.findFirst({
      where: and(eq(recruitmentVendors.id, id), eq(recruitmentVendors.orgId, session.orgId)),
    });
    if (!existing) return err("Not found", 404);

    const body = await parseBody(req, updateSchema);
    const [updated] = await db
      .update(recruitmentVendors)
      .set({
        ...body,
        feePercent: body.feePercent !== undefined ? String(body.feePercent) : undefined,
        website: body.website || undefined,
      })
      .where(eq(recruitmentVendors.id, id))
      .returning();
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    if (!isHrRole(session.user.role ?? "")) return err("Forbidden", 403);
    const { vendorId } = await params;
    const id = Number(vendorId);
    if (!Number.isFinite(id)) return err("Invalid vendor ID", 400);

    await db
      .delete(recruitmentVendors)
      .where(and(eq(recruitmentVendors.id, id), eq(recruitmentVendors.orgId, session.orgId)));
    return ok({ success: true });
  });
}
