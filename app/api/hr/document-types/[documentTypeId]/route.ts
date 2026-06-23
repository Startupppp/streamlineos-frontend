import { withAuth, withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTypes } from "@/lib/db/schema/hr";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ documentTypeId: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  description: z.string().max(500).optional(),
  isMandatory: z.boolean().optional(),
  isActive: z.boolean().optional(),
  applicableRoles: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { documentTypeId: rawId } = await params;
    const documentTypeId = Number(rawId);
    if (!Number.isFinite(documentTypeId)) return err("Invalid document type ID.", 400);

    const row = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.id, documentTypeId),
        eq(documentTypes.orgId, session.orgId)
      ),
    });
    if (!row) return err("Document type not found.", 404);

    return ok(row);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAbility("manage", "hr:documents", async (session) => {
    const { documentTypeId: rawId } = await params;
    const documentTypeId = Number(rawId);
    if (!Number.isFinite(documentTypeId)) return err("Invalid document type ID.", 400);

    const body = await parseBody(req, patchSchema);

    const existing = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.id, documentTypeId),
        eq(documentTypes.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Document type not found.", 404);

    const [updated] = await db
      .update(documentTypes)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isMandatory !== undefined && { isMandatory: body.isMandatory }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.applicableRoles !== undefined && { applicableRoles: body.applicableRoles }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documentTypes.id, documentTypeId),
          eq(documentTypes.orgId, session.orgId)
        )
      )
      .returning();

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withAbility("manage", "hr:documents", async (session) => {
    const { documentTypeId: rawId } = await params;
    const documentTypeId = Number(rawId);
    if (!Number.isFinite(documentTypeId)) return err("Invalid document type ID.", 400);

    const existing = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.id, documentTypeId),
        eq(documentTypes.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Document type not found.", 404);

    const [updated] = await db
      .update(documentTypes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(documentTypes.id, documentTypeId),
          eq(documentTypes.orgId, session.orgId)
        )
      )
      .returning();

    return ok(updated);
  });
}
