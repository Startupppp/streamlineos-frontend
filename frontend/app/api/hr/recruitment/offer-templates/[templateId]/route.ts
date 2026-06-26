import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { offerLetterTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  htmlContent: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ templateId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const { templateId } = await params;
    const id = Number(templateId);
    if (!Number.isFinite(id)) return err("Invalid template ID", 400);

    const body = await parseBody(req, updateSchema);

    if (body.isDefault) {
      await db.update(offerLetterTemplates)
        .set({ isDefault: false })
        .where(eq(offerLetterTemplates.orgId, session.orgId));
    }

    const [updated] = await db
      .update(offerLetterTemplates)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(offerLetterTemplates.id, id), eq(offerLetterTemplates.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Template not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const { templateId } = await params;
    const id = Number(templateId);
    if (!Number.isFinite(id)) return err("Invalid template ID", 400);

    const [deleted] = await db
      .delete(offerLetterTemplates)
      .where(and(eq(offerLetterTemplates.id, id), eq(offerLetterTemplates.orgId, session.orgId)))
      .returning({ id: offerLetterTemplates.id });

    if (!deleted) return err("Template not found", 404);
    return ok({ success: true });
  });
}
