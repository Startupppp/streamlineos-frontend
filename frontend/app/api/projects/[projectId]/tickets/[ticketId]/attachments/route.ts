import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketAttachments, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

const attachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileKey: z.string().optional(),
  fileSize: z.number(),
  mimeType: z.string(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId: tid } = await params;
    const ticketId = Number(tid);
    if (!ticketId) return err("Invalid ticket id", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.orgId, session.orgId!)),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const body = await parseBody(req, attachmentSchema);

    const [attachment] = await db
      .insert(ticketAttachments)
      .values({
        orgId: session.orgId!,
        ticketId,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        uploadedBy: session.user.id,
      })
      .returning();

    return ok({ id: attachment.id }, 201);
  });
}
