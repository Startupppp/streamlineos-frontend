import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { scorecardTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const criterionSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(100),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  criteria: z.array(criterionSchema).min(1),
}).partial();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { templateId: id } = await params;
    const templateId = Number(id);
    if (!templateId) return err("Invalid template ID.", 400);

    const existing = await db.query.scorecardTemplates.findFirst({
      where: and(
        eq(scorecardTemplates.id, templateId),
        eq(scorecardTemplates.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Template not found.", 404);

    const body = await parseBody(req, updateTemplateSchema);

    await db
      .update(scorecardTemplates)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.criteria !== undefined && { criteria: body.criteria }),
        updatedAt: new Date(),
      })
      .where(eq(scorecardTemplates.id, templateId));

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { templateId: id } = await params;
    const templateId = Number(id);
    if (!templateId) return err("Invalid template ID.", 400);

    await db
      .delete(scorecardTemplates)
      .where(
        and(
          eq(scorecardTemplates.id, templateId),
          eq(scorecardTemplates.orgId, session.orgId)
        )
      );

    return ok({ success: true });
  });
}
