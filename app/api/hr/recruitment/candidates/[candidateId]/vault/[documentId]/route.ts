import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateDocumentsVault, vaultAccessLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getFileUrl, isStorageConfigured } from "@/lib/storage";

type RouteParams = { params: Promise<{ candidateId: string; documentId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { candidateId: cidParam, documentId: didParam } = await params;
    const candidateId = Number(cidParam);
    const documentId = Number(didParam);
    if (!candidateId || !documentId) return err("Invalid ID.", 400);

    const doc = await db.query.candidateDocumentsVault.findFirst({
      where: and(
        eq(candidateDocumentsVault.id, documentId),
        eq(candidateDocumentsVault.candidateId, candidateId),
        eq(candidateDocumentsVault.orgId, session.orgId)
      ),
    });
    if (!doc) return err("Document not found.", 404);

    // Log the access
    await db.insert(vaultAccessLogs).values({
      vaultDocumentId: documentId,
      accessedBy: session.user.id,
      action: "VIEW",
    });

    // Generate a presigned URL that expires in 15 minutes
    let signedUrl = doc.fileUrl;
    if (doc.s3Key && isStorageConfigured()) {
      try {
        signedUrl = await getFileUrl(doc.s3Key, 900); // 900 seconds = 15 minutes
      } catch {
        // Fall back to stored URL if signing fails
      }
    }

    return ok({ ...doc, signedUrl });
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { candidateId: cidParam, documentId: didParam } = await params;
    const candidateId = Number(cidParam);
    const documentId = Number(didParam);
    if (!candidateId || !documentId) return err("Invalid ID.", 400);

    const doc = await db.query.candidateDocumentsVault.findFirst({
      where: and(
        eq(candidateDocumentsVault.id, documentId),
        eq(candidateDocumentsVault.candidateId, candidateId),
        eq(candidateDocumentsVault.orgId, session.orgId)
      ),
    });
    if (!doc) return err("Document not found.", 404);

    // Log the delete action before removing
    await db.insert(vaultAccessLogs).values({
      vaultDocumentId: documentId,
      accessedBy: session.user.id,
      action: "DOWNLOAD",
    });

    await db
      .delete(candidateDocumentsVault)
      .where(eq(candidateDocumentsVault.id, documentId));

    return ok({ success: true });
  });
}
