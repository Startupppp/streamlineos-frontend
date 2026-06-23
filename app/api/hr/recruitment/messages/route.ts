import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateMessages, candidates, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  candidateId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const createSchema = z.object({
  candidateId: z.number().int().positive(),
  channel: z.enum(["EMAIL", "WHATSAPP", "IN_APP"]).default("EMAIL"),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(10_000),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { candidateId, limit } = parseQuery(req, listSchema);
    const conditions = [eq(candidateMessages.orgId, session.orgId)];
    if (candidateId) conditions.push(eq(candidateMessages.candidateId, candidateId));

    const rows = await db
      .select({
        id: candidateMessages.id,
        candidateId: candidateMessages.candidateId,
        direction: candidateMessages.direction,
        channel: candidateMessages.channel,
        subject: candidateMessages.subject,
        body: candidateMessages.body,
        sentBy: candidateMessages.sentBy,
        sentAt: candidateMessages.sentAt,
        readAt: candidateMessages.readAt,
        externalId: candidateMessages.externalId,
        senderName: users.name,
        candidateFirstName: candidates.firstName,
        candidateLastName: candidates.lastName,
        candidateEmail: candidates.email,
      })
      .from(candidateMessages)
      .leftJoin(users, eq(candidateMessages.sentBy, users.id))
      .leftJoin(candidates, eq(candidateMessages.candidateId, candidates.id))
      .where(and(...conditions))
      .orderBy(desc(candidateMessages.sentAt))
      .limit(limit);

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, body.candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!candidate) return err("Candidate not found", 404);

    if (body.channel === "EMAIL") {
      try {
        await sendEmail({
          to: candidate.email,
          subject: body.subject ?? `Message from your recruiter`,
          html: `<p>${body.body.replace(/\n/g, "<br>")}</p>`,
        });
      } catch {
        return err("Failed to send email", 502);
      }
    }

    const [message] = await db
      .insert(candidateMessages)
      .values({
        orgId: session.orgId,
        candidateId: body.candidateId,
        direction: "OUTBOUND",
        channel: body.channel,
        subject: body.subject,
        body: body.body,
        sentBy: session.user.id,
      })
      .returning();

    return ok(message, 201);
  });
}
