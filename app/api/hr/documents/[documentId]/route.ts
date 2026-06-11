import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

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
