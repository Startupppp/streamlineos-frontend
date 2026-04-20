import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { extractVariables } from "@/lib/utils/document-variables";
import type { NextRequest } from "next/server";

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

    const variables = extractVariables(template.htmlContent);
    const placeholderMap: Record<string, string> = {};
    for (const v of variables) {
      placeholderMap[v] = `[${v}]`;
    }

    const previewContent = template.htmlContent.replace(
      /\{\{([^}]+)\}\}/g,
      (_match, key: string) => `[${key.trim()}]`
    );

    return ok({ ...template, htmlContent: previewContent, previewVariables: placeholderMap });
  });
}
