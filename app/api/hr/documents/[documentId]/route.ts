import { withAuth, ok, err, parseBody } from "@/lib/api/helpers"; 
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  type: z.enum(["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"]).optional(),
  category: z.string().max(100).optional().nullable(),
  userId: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  expiryDate: z.string().optional().nullable(),
});

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (isNaN(documentId)) return err("Invalid document ID.", 400);

    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.orgId, session.orgId)),
      columns: { id: true, userId: true, name: true },
    });
    if (!doc) return err("Document not found.", 404);

    const isOwner = doc.userId === session.user.id;
    const ability = await getSessionAbility();
    const isAdmin = ability.can("manage", "hr:documents");
    if (!isOwner && !isAdmin) return err("Not authorized to update this document.", 403);

    const body = await parseBody(req, updateSchema);
    const [updated] = await db
      .update(documents)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.category !== undefined ? { category: body.category ?? null } : {}),
        ...(body.userId !== undefined ? { userId: body.userId ?? null } : {}),
        ...(body.isPublic !== undefined ? { isPublic: body.isPublic } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.expiryDate !== undefined ? { expiryDate: body.expiryDate ?? null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), eq(documents.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  return withAuth(async (session) => {
    const { documentId: id } = await params;
    const documentId = Number(id);
    if (isNaN(documentId)) return err("Invalid document ID.", 400);

    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, documentId), eq(documents.orgId, session.orgId)),
      columns: { id: true, userId: true, name: true },
    });

    if (!doc) return err("Document not found.", 404);

    const isOwner = doc.userId === session.user.id;
    const ability = await getSessionAbility();

    const isAdmin = ability.can("manage", "hr:documents");

    if (!isOwner && !isAdmin) return err("Not authorized to delete this document.", 403);

    await db
      .update(documents)
      .set({ isActive: false })
      .where(and(eq(documents.id, documentId), eq(documents.orgId, session.orgId)));

    void createAuditLog({
      action: "hr.document_deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(documentId),
      targetType: "document",
      metadata: { name: doc.name },
    }).catch(() => {});

    return ok({ success: true });
  });
}
