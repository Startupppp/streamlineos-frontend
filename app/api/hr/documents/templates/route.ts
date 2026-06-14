import { withAuth, withAbility, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTemplates } from "@/lib/db/schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { z } from "zod";
import { extractVariables } from "@/lib/utils/document-variables";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  type: z.string().optional(),
});

const createSchema = z.object({
  title: z
    .string()
    .min(2, "Template name must be at least 2 characters")
    .max(100, "Template name must be at most 100 characters")
    .refine((v) => /[a-zA-Z]/.test(v), { message: "Template name must contain at least one letter" })
    .refine((v) => !/\s{2,}/.test(v), { message: "Template name cannot have consecutive spaces" }),
  type: z.string().min(1, "Type is required").default("OFFER"),
  htmlContent: z.string().default(""),
  variables: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { type } = parseQuery(req, listSchema);

    const conditions = [
      eq(documentTemplates.orgId, session.orgId),
      eq(documentTemplates.isActive, true),
    ];
    if (type) conditions.push(eq(documentTemplates.type, type));

    const data = await db
      .select()
      .from(documentTemplates)
      .where(and(...conditions))
      .orderBy(desc(documentTemplates.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "hr:documents", async (session) => {
    const body = await parseBody(req, createSchema);

    const [existing] = await db
      .select({ id: documentTemplates.id })
      .from(documentTemplates)
      .where(
        and(
          eq(documentTemplates.orgId, session.orgId),
          eq(documentTemplates.isActive, true),
          ilike(documentTemplates.title, body.title.trim())
        )
      )
      .limit(1);
    if (existing) return err("A template with this name already exists", 409);

    const variables = body.variables ?? extractVariables(body.htmlContent);

    const [template] = await db
      .insert(documentTemplates)
      .values({
        orgId: session.orgId,
        title: body.title,
        type: body.type,
        htmlContent: body.htmlContent,
        variables,
        createdBy: session.user.id,
      })
      .returning();

    if (!template) return err("Failed to create template", 500);

    return ok(template, 201);
  });
}
