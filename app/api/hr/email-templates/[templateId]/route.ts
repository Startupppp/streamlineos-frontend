import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  return withAdmin(async (session) => {
    const { templateId: id } = await params;
    const templateId = Number(id);
    if (isNaN(templateId)) return err("Invalid template ID.", 400);

    const body = patchSchema.parse(await req.json());

    const [updated] = await db
      .update(emailTemplates)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.orgId, session.orgId)
        )
      )
      .returning();

    if (!updated) return err("Template not found.", 404);
    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  return withAdmin(async (session) => {
    const { templateId: id } = await params;
    const templateId = Number(id);
    if (isNaN(templateId)) return err("Invalid template ID.", 400);

    const [deleted] = await db
      .delete(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, templateId),
          eq(emailTemplates.orgId, session.orgId)
        )
      )
      .returning();

    if (!deleted) return err("Template not found.", 404);
    return ok({ success: true });
  });
}
