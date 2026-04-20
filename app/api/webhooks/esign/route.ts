

import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit-log";
import { NextResponse, type NextRequest } from "next/server";

type EsignEvent = "document.signed" | "document.viewed" | "document.declined" | "document.sent";

interface DocumensoWebhookPayload {
  event: EsignEvent;
  data: {
    id: string | number;
    status?: string;
  };
}

interface DocuSignWebhookPayload {
  event: string;
  data?: {
    envelopeId?: string;
  };
  envelopeId?: string;
  status?: string;
}

type WebhookPayload = DocumensoWebhookPayload | DocuSignWebhookPayload;

function verifyDocumensoSignature(body: string, signature: string | null): boolean {
  const secret = process.env.ESIGN_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;

  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  try {
    return signature.length === expected.length &&
      Buffer.from(signature, "hex").compare(Buffer.from(expected, "hex")) === 0;
  } catch {
    return false;
  }
}

function normalizePayload(raw: WebhookPayload): {
  event: EsignEvent | null;
  externalDocId: string | null;
} {
  if ("event" in raw && "data" in raw && raw.data && "id" in raw.data) {
    const documenso = raw as DocumensoWebhookPayload;
    const knownEvents: EsignEvent[] = [
      "document.signed",
      "document.viewed",
      "document.declined",
      "document.sent",
    ];
    const event = knownEvents.includes(documenso.event as EsignEvent)
      ? documenso.event
      : null;
    return { event, externalDocId: String(documenso.data.id) };
  }

  const docusign = raw as DocuSignWebhookPayload;
  const envelopeId = docusign.data?.envelopeId ?? docusign.envelopeId ?? null;
  const status = docusign.status?.toLowerCase();
  let event: EsignEvent | null = null;
  if (status === "completed") event = "document.signed";
  else if (status === "declined") event = "document.declined";
  else if (status === "delivered") event = "document.viewed";
  else if (status === "sent") event = "document.sent";

  return { event, externalDocId: envelopeId ?? null };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-documenso-signature") ??
    req.headers.get("x-docusign-signature") ?? null;

  if (!verifyDocumensoSignature(rawBody, signature)) {
    logger.warn("E-sign webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, externalDocId } = normalizePayload(payload);

  if (!externalDocId) {
    logger.warn("E-sign webhook: missing document ID in payload", { payload });
    return ok({ received: true, processed: false, reason: "missing_doc_id" });
  }

  const doc = await db.query.candidateDocuments.findFirst({
    where: eq(candidateDocuments.externalDocId, externalDocId),
    columns: { id: true, status: true },
  });

  if (!doc) {
    logger.warn("E-sign webhook: document not found", { externalDocId });
    return ok({ received: true, processed: false, reason: "document_not_found" });
  }

  const now = new Date();
  let updateFields: Partial<typeof candidateDocuments.$inferInsert> = {};

  switch (event) {
    case "document.viewed":
      updateFields = { status: "VIEWED", viewedAt: now, updatedAt: now };
      break;
    case "document.signed":
      updateFields = { status: "SIGNED", signedAt: now, updatedAt: now };
      break;
    case "document.declined":
      updateFields = { status: "DECLINED", declinedAt: now, updatedAt: now };
      break;
    case "document.sent":
      updateFields = { status: "SENT", sentAt: now, updatedAt: now };
      break;
    default:
      return ok({ received: true, processed: false, reason: "unknown_event" });
  }

  const updatedDoc = await db
    .update(candidateDocuments)
    .set(updateFields)
    .where(eq(candidateDocuments.id, doc.id))
    .returning({ candidateId: candidateDocuments.candidateId, orgId: candidateDocuments.orgId })
    .then((rows) => rows[0]);

  if (updatedDoc && event && event !== "document.sent") {
    void createAuditLog({
      action: event,
      userId: "esign-webhook",
      orgId: updatedDoc.orgId,
      targetId: String(doc.id),
      targetType: "candidate_document",
      metadata: { externalDocId, candidateId: updatedDoc.candidateId },
    }).catch(() => undefined);
  }

  logger.info("E-sign webhook processed", {
    event,
    externalDocId,
    documentId: doc.id,
    newStatus: updateFields.status,
  });

  return ok({ received: true, processed: true, documentId: doc.id, event });
}
