import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTypes, onboardingDocuments, documentAuditLogs } from "@/lib/db/schema/hr";
import { users } from "@/lib/db/schema/auth";
import { eq, and, desc } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  userId: z.string().optional(),
});

const createSchema = z.object({
  documentTypeId: z.number().int().positive("documentTypeId is required"),
  fileUrl: z.string().url("fileUrl must be a valid URL"),
  fileName: z.string().min(1, "fileName is required"),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
});


export async function recalcOnboardingStatus(
  orgId: string,
  userId: string
): Promise<void> {
  const mandatoryTypes = await db
    .select({ id: documentTypes.id })
    .from(documentTypes)
    .where(
      and(
        eq(documentTypes.orgId, orgId),
        eq(documentTypes.isActive, true),
        eq(documentTypes.isMandatory, true)
      )
    );

  if (mandatoryTypes.length === 0) {
    await db
      .update(users)
      .set({ onboardingDocStatus: "APPROVED", updatedAt: new Date() })
      .where(eq(users.id, userId));
    return;
  }

  const mandatoryTypeIds = mandatoryTypes.map((t) => t.id);

  const userDocs = await db
    .select({
      documentTypeId: onboardingDocuments.documentTypeId,
      status: onboardingDocuments.status,
    })
    .from(onboardingDocuments)
    .where(
      and(
        eq(onboardingDocuments.orgId, orgId),
        eq(onboardingDocuments.userId, userId)
      )
    )
    .orderBy(desc(onboardingDocuments.id));

  const latestByType = new Map<number, string>();
  for (const doc of userDocs) {
    if (!latestByType.has(doc.documentTypeId)) {
      latestByType.set(doc.documentTypeId, doc.status ?? "PENDING");
    }
  }

  const allApproved = mandatoryTypeIds.every(
    (id) => latestByType.get(id) === "APPROVED"
  );

  const anyInProgress = mandatoryTypeIds.some((id) => {
    const s = latestByType.get(id);
    return s === "SUBMITTED" || s === "RE_UPLOAD_REQUESTED";
  });

  const newStatus = allApproved
    ? ("APPROVED" as const)
    : anyInProgress
      ? ("IN_PROGRESS" as const)
      : ("PENDING" as const);

  await db
    .update(users)
    .set({ onboardingDocStatus: newStatus, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

const reviewerUsers = aliasedTable(users, "reviewer");

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin =
      session.user.role === "CEO" ||
      session.user.role === "HR" ||
      session.user.role === "ADMIN";

    if (isAdmin) {
      const query = parseQuery(req, querySchema);

      const conditions = query.userId
        ? and(
            eq(onboardingDocuments.orgId, session.orgId),
            eq(onboardingDocuments.userId, query.userId)
          )
        : eq(onboardingDocuments.orgId, session.orgId);

      const rows = await db
        .select({
          id: onboardingDocuments.id,
          orgId: onboardingDocuments.orgId,
          userId: onboardingDocuments.userId,
          employeeName: users.name,
          documentTypeId: onboardingDocuments.documentTypeId,
          documentTypeName: documentTypes.name,
          isMandatory: documentTypes.isMandatory,
          fileUrl: onboardingDocuments.fileUrl,
          fileName: onboardingDocuments.fileName,
          fileSize: onboardingDocuments.fileSize,
          mimeType: onboardingDocuments.mimeType,
          version: onboardingDocuments.version,
          status: onboardingDocuments.status,
          reviewedBy: onboardingDocuments.reviewedBy,
          reviewedAt: onboardingDocuments.reviewedAt,
          remarks: onboardingDocuments.remarks,
          createdAt: onboardingDocuments.createdAt,
          updatedAt: onboardingDocuments.updatedAt,
          reviewerName: reviewerUsers.name,
        })
        .from(onboardingDocuments)
        .innerJoin(
          documentTypes,
          eq(onboardingDocuments.documentTypeId, documentTypes.id)
        )
        .innerJoin(users, eq(onboardingDocuments.userId, users.id))
        .leftJoin(reviewerUsers, eq(onboardingDocuments.reviewedBy, reviewerUsers.id))
        .where(conditions)
        .orderBy(desc(onboardingDocuments.createdAt));

      return ok(rows);
    }

    const rows = await db
      .select({
        id: onboardingDocuments.id,
        orgId: onboardingDocuments.orgId,
        userId: onboardingDocuments.userId,
        documentTypeId: onboardingDocuments.documentTypeId,
        documentTypeName: documentTypes.name,
        isMandatory: documentTypes.isMandatory,
        fileUrl: onboardingDocuments.fileUrl,
        fileName: onboardingDocuments.fileName,
        fileSize: onboardingDocuments.fileSize,
        mimeType: onboardingDocuments.mimeType,
        version: onboardingDocuments.version,
        status: onboardingDocuments.status,
        reviewedBy: onboardingDocuments.reviewedBy,
        reviewedAt: onboardingDocuments.reviewedAt,
        remarks: onboardingDocuments.remarks,
        createdAt: onboardingDocuments.createdAt,
        updatedAt: onboardingDocuments.updatedAt,
        reviewerName: reviewerUsers.name,
      })
      .from(onboardingDocuments)
      .innerJoin(
        documentTypes,
        eq(onboardingDocuments.documentTypeId, documentTypes.id)
      )
      .leftJoin(reviewerUsers, eq(onboardingDocuments.reviewedBy, reviewerUsers.id))
      .where(
        and(
          eq(onboardingDocuments.orgId, session.orgId),
          eq(onboardingDocuments.userId, session.user.id)
        )
      )
      .orderBy(desc(onboardingDocuments.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);

    const docType = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.id, body.documentTypeId),
        eq(documentTypes.orgId, session.orgId),
        eq(documentTypes.isActive, true)
      ),
    });
    if (!docType) return err("Document type not found or inactive.", 404);

    const existing = await db
      .select({ id: onboardingDocuments.id, version: onboardingDocuments.version })
      .from(onboardingDocuments)
      .where(
        and(
          eq(onboardingDocuments.orgId, session.orgId),
          eq(onboardingDocuments.userId, session.user.id),
          eq(onboardingDocuments.documentTypeId, body.documentTypeId)
        )
      )
      .orderBy(desc(onboardingDocuments.version))
      .limit(1);

    const isReUpload = existing.length > 0;
    const nextVersion = isReUpload ? (existing[0].version ?? 1) + 1 : 1;
    const auditAction = isReUpload ? ("RE_UPLOADED" as const) : ("UPLOADED" as const);

    const [record] = await db
      .insert(onboardingDocuments)
      .values({
        orgId: session.orgId,
        userId: session.user.id,
        documentTypeId: body.documentTypeId,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        version: nextVersion,
        status: "SUBMITTED",
      })
      .returning();

    await db.insert(documentAuditLogs).values({
      orgId: session.orgId,
      onboardingDocumentId: record.id,
      action: auditAction,
      performedBy: session.user.id,
      metadata: { fileName: body.fileName, version: nextVersion },
    });

    await recalcOnboardingStatus(session.orgId, session.user.id);

    return ok(record, 201);
  });
}
