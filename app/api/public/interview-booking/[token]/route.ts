import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviewBookingLinks, interviews, calendarEvents, candidates, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "@/lib/email";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const link = await db.query.interviewBookingLinks.findFirst({
    where: eq(interviewBookingLinks.token, token),
  });

  if (!link) {
    return NextResponse.json({ error: "Booking link not found." }, { status: 404 });
  }

  if (link.status !== "pending") {
    return NextResponse.json({ error: "This booking link has already been used.", status: link.status }, { status: 410 });
  }

  if (new Date() > link.expiresAt) {
    return NextResponse.json({ error: "This booking link has expired." }, { status: 410 });
  }

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.id, link.candidateId),
    columns: { firstName: true, lastName: true },
  });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, link.orgId),
    columns: { name: true },
  });

  return NextResponse.json({
    candidateName: candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate",
    orgName: org?.name ?? "StreamlineOS",
    interviewType: link.interviewType,
    durationMinutes: link.durationMinutes,
    availableSlots: link.availableSlots,
    notes: link.notes,
  });
}

const bookSchema = z.object({
  slotStart: z.string().datetime(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;

  const link = await db.query.interviewBookingLinks.findFirst({
    where: eq(interviewBookingLinks.token, token),
  });

  if (!link) {
    return NextResponse.json({ error: "Booking link not found." }, { status: 404 });
  }

  if (link.status !== "pending") {
    return NextResponse.json({ error: "This booking link has already been used." }, { status: 410 });
  }

  if (new Date() > link.expiresAt) {
    return NextResponse.json({ error: "This booking link has expired." }, { status: 410 });
  }

  let body: z.infer<typeof bookSchema>;
  try {
    body = bookSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const slotStart = new Date(body.slotStart);
  const validSlot = link.availableSlots.some(
    (s) => new Date(s.start).getTime() === slotStart.getTime()
  );
  if (!validSlot) {
    return NextResponse.json({ error: "Selected slot is not available." }, { status: 400 });
  }

  const endDate = new Date(slotStart.getTime() + link.durationMinutes * 60_000);

  const typeMap: Record<string, "VIDEO" | "PHONE" | "ONSITE"> = {
    VIDEO: "VIDEO",
    PHONE: "PHONE",
    IN_PERSON: "ONSITE",
  };

  const [interview] = await db
    .insert(interviews)
    .values({
      orgId: link.orgId,
      candidateId: link.candidateId,
      jobPostingId: link.jobPostingId,
      interviewerId: link.interviewerIds[0] ?? link.createdBy,
      type: typeMap[link.interviewType] ?? "VIDEO",
      scheduledAt: slotStart,
      duration: link.durationMinutes,
      notes: link.notes,
      result: "PENDING",
      remindersSent: {},
    })
    .returning();

  await db.insert(calendarEvents).values({
    orgId: link.orgId,
    title: `Interview (self-scheduled)`,
    description: link.notes ?? `Self-scheduled ${link.interviewType} interview`,
    startDate: slotStart,
    endDate,
    allDay: false,
    category: "interview",
    entityType: "interview",
    entityId: String(interview.id),
    createdBy: link.createdBy,
    attendeeIds: link.interviewerIds,
  });

  await db
    .update(interviewBookingLinks)
    .set({ status: "booked", selectedSlot: slotStart, updatedAt: new Date() })
    .where(eq(interviewBookingLinks.id, link.id));

  void (async () => {
    try {
      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, link.candidateId),
        columns: { firstName: true, lastName: true },
      });
      const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate";
      const { users } = await import("@/lib/db/schema");
      const creator = await db.query.users.findFirst({
        where: eq(users.id, link.createdBy),
        columns: { email: true, name: true },
      });
      if (creator?.email) {
        await sendEmail({
          to: creator.email,
          subject: `Interview Self-Scheduled: ${candidateName}`,
          html: `<p>${candidateName} has scheduled their interview for <strong>${slotStart.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" })}</strong>.</p>`,
        });
      }
    } catch {  }
  })();

  return NextResponse.json({ success: true, interviewId: interview.id });
}
