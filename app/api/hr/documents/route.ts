import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getDocuments } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { documents, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";

const DOCUMENT_TYPES = [
  "CONTRACT",
  "CERTIFICATE",
  "ID_PROOF",
  "PAYSLIP",
  "POLICY",
  "OFFER_LETTER",
  "RESUME",
  "OTHER",
] as const;

const createDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(DOCUMENT_TYPES),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;
    const type = searchParams.get("type") ?? undefined;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' documents.", 403);
    }

    const data = await getDocuments(session.orgId, session.user.id, isAdmin, {
      filterUserId,
      type,
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);

    const body = await parseBody(req, createDocumentSchema);

    const targetUserId =
      body.userId && isAdmin ? body.userId : session.user.id;

    if (targetUserId !== session.user.id) {
      const targetMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.orgId, session.orgId)
        ),
      });
      if (!targetMember) {
        return err("Target user not found in your organization.", 404);
      }
    }

    const [document] = await db
      .insert(documents)
      .values({
        orgId: session.orgId,
        userId: targetUserId,
        name: body.name,
        type: body.type,
        fileUrl: body.fileUrl,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        uploadedBy: session.user.id,
        isActive: true,
      })
      .returning();

    void createAuditLog({
      action: "hr.document_uploaded",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(document.id),
      targetType: "document",
      metadata: { name: body.name, type: body.type, targetUserId },
    }).catch(() => {});

    return ok(document);
  });
}
