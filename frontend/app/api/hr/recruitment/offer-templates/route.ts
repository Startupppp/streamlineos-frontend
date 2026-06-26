import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { offerLetterTemplates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  htmlContent: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const templates = await db.query.offerLetterTemplates.findMany({
      where: eq(offerLetterTemplates.orgId, session.orgId),
      with: { creator: { columns: { id: true, name: true } } },
      orderBy: [desc(offerLetterTemplates.createdAt)],
    });
    return ok(templates);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, createSchema);

    if (body.isDefault) {
      await db.update(offerLetterTemplates)
        .set({ isDefault: false })
        .where(eq(offerLetterTemplates.orgId, session.orgId));
    }

    const [template] = await db.insert(offerLetterTemplates).values({
      orgId: session.orgId,
      name: body.name,
      htmlContent: body.htmlContent,
      isDefault: body.isDefault ?? false,
      createdBy: session.user.id,
    }).returning();

    return ok(template, 201);
  });
}
