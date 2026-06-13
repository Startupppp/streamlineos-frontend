import { withAuth, withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTemplates, documentTemplateVersions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { extractVariables } from "@/lib/utils/document-variables";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  htmlContent: z.string().optional(),
  variables: z.array(z.string()).optional(),
});

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { templateId } = await params;
    const id = Number(templateId);
    if (!Number.isFinite(id)) return err("Invalid template ID", 400);

    const [template] = await db
      .select()
      .from(documentTemplates)
      .where(and(eq(documentTemplates.id, id), eq(documentTemplates.orgId, session.orgId)))
      .limit(1);

    if (!template) return err("Template not found", 404);

    return ok(template);
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  return withAbility("manage", "hr:documents", async (session) => {
    const { templateId } = await params;
    const id = Number(templateId);
    if (!Number.isFinite(id)) return err("Invalid template ID", 400);

    const body = await parseBody(req, updateSchema);

    const [existing] = await db
      .select()
      .from(documentTemplates)
      .where(and(eq(documentTemplates.id, id), eq(documentTemplates.orgId, session.orgId)))
      .limit(1);

    if (!existing) return err("Template not found", 404);

    const contentChanging =
      body.htmlContent !== undefined && body.htmlContent !== existing.htmlContent;
    if (contentChanging) {
      await db.insert(documentTemplateVersions).values({
        templateId: existing.id,
        orgId: existing.orgId,
        version: existing.version,
        title: existing.title,
        type: existing.type,
        htmlContent: existing.htmlContent,
        variables: (existing.variables as string[]) ?? [],
        archivedBy: session.user.id,
      });
    }

    let variables = body.variables;
    if (body.htmlContent !== undefined && variables === undefined) {
      variables = extractVariables(body.htmlContent);
    }

    const [updated] = await db
      .update(documentTemplates)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.htmlContent !== undefined && { htmlContent: body.htmlContent }),
        ...(variables !== undefined && { variables }),
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(documentTemplates.id, id))
      .returning();

    if (!updated) return err("Failed to update template", 500);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAbility("manage", "hr:documents", async (session) => {
    const { templateId } = await params;
    const id = Number(templateId);
    if (!Number.isFinite(id)) return err("Invalid template ID", 400);

    const [existing] = await db
      .select()
      .from(documentTemplates)
      .where(and(eq(documentTemplates.id, id), eq(documentTemplates.orgId, session.orgId)))
      .limit(1);

    if (!existing) return err("Template not found", 404);

    await db
      .update(documentTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(documentTemplates.id, id));

    return ok({ success: true });
  });
}
