import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviews, candidates, calendarEvents, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { createNotification } from "@/server/actions/create-notification";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppWithSmsFallback } from "@/lib/twilio";
import { getInterviewInviteEmail } from "@/lib/email-templates/hr";
import { format as formatDate } from "date-fns";
import type { NextRequest } from "next/server";

const scheduleSchema = z.object({
  candidateId: z.number().int().positive(),
  jobPostingId: z.number().int().positive().optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().default(60),
  format: z.enum(["VIDEO", "PHONE", "IN_PERSON"]).default("VIDEO"),
  interviewers: z.array(z.string()).min(1),
  notes: z.string().max(2000).optional(),
  createMeet: z.boolean().default(false),
  notifyChannels: z
    .object({
      email: z.boolean().default(true),
      whatsapp: z.boolean().default(false),
    })
    .default({ email: true, whatsapp: false }),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, scheduleSchema);

    // Validate candidate belongs to this org
    const candidate = await db.query.candidates.findFirst({
      where: and(
        eq(candidates.id, body.candidateId),
        eq(candidates.orgId, session.orgId)
      ),
    });

    if (!candidate) {
      return err("Candidate not found", 404);
    }

    const scheduledDate = new Date(body.scheduledAt);
    const endDate = new Date(scheduledDate.getTime() + body.durationMinutes * 60 * 1000);

    // Map format to the existing interviewTypeEnum values
    const typeMap: Record<string, "VIDEO" | "PHONE" | "ONSITE" | "TECHNICAL" | "HR" | "FINAL"> = {
      VIDEO: "VIDEO",
      PHONE: "PHONE",
      IN_PERSON: "ONSITE",
    };

    // Use first interviewer for the legacy single-interviewer column
    const primaryInterviewerId = body.interviewers[0];

    const [interview] = await db
      .insert(interviews)
      .values({
        orgId: session.orgId,
        candidateId: body.candidateId,
        jobPostingId: body.jobPostingId,
        interviewerId: primaryInterviewerId,
        panelInterviewerIds: body.interviewers.length > 1 ? body.interviewers : [],
        type: typeMap[body.format] ?? "VIDEO",
        scheduledAt: scheduledDate,
        duration: body.durationMinutes,
        notes: body.notes,
        result: "PENDING",
        remindersSent: {},
      })
      .returning();

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;

    // Create a calendar event for the interview
    await db.insert(calendarEvents).values({
      orgId: session.orgId,
      title: `Interview: ${candidateName}`,
      description: body.notes ?? `${body.format} interview with ${candidateName}`,
      startDate: scheduledDate,
      endDate,
      allDay: false,
      category: "interview",
      entityType: "interview",
      entityId: String(interview.id),
      createdBy: session.user.id,
      attendeeIds: body.interviewers,
    });

    // Send in-app notifications to all interviewers
    const notifPromises = body.interviewers.map((userId) =>
      createNotification({
        orgId: session.orgId,
        userId,
        type: "INFO",
        title: "New Interview Scheduled",
        message: `You have been assigned to interview ${candidateName} on ${scheduledDate.toLocaleString()}.`,
        link: `/hr/recruitment/interviews/${interview.id}`,
        metadata: { interviewId: interview.id, candidateId: body.candidateId },
      })
    );

    await Promise.all(notifPromises);

    const dateLabel = formatDate(scheduledDate, "PPp");
    const formatLabel =
      body.format === "VIDEO" ? "Video Call" : body.format === "PHONE" ? "Phone Call" : "In-Person";

    // Sync to Google Calendar if current user has connected Google account (non-blocking)
    void (async () => {
      try {
        const currentUser = await db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: { googleRefreshToken: true },
        });
        if (currentUser?.googleRefreshToken) {
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID ?? "",
              client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
              refresh_token: currentUser.googleRefreshToken,
              grant_type: "refresh_token",
            }),
          });
          if (tokenRes.ok) {
            const { access_token } = await tokenRes.json() as { access_token: string };
            await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
              method: "POST",
              headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                summary: `Interview: ${candidateName} - ${body.format}`,
                description: body.notes ?? `${body.format} interview with ${candidateName}`,
                start: { dateTime: scheduledDate.toISOString() },
                end: { dateTime: endDate.toISOString() },
                ...(interview.meetingLink && {
                  conferenceData: { entryPoints: [{ entryPointType: "video", uri: interview.meetingLink }] },
                }),
              }),
            });
          }
        }
      } catch {
        // Non-blocking — Google sync failure should not affect scheduling
      }
    })();

    // Send email + optional WhatsApp to interviewers and candidate (non-blocking)
    void (async () => {
      try {
        // Fetch interviewer emails
        const interviewerUsers = await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, phone: users.phone })
          .from(users)
          .where(inArray(users.id, body.interviewers));

        const emailTasks: Promise<unknown>[] = [];

        if (body.notifyChannels.email) {
          // Notify each interviewer
          for (const interviewer of interviewerUsers) {
            if (!interviewer.email) continue;
            const { subject, html } = getInterviewInviteEmail({
              recipientName: `${interviewer.firstName ?? ""} ${interviewer.lastName ?? ""}`.trim() || "Interviewer",
              candidateName,
              jobTitle: "this position",
              companyName: "Vaivamm Capital",
              scheduledAt: dateLabel,
              durationMinutes: body.durationMinutes,
              format: formatLabel,
              notes: body.notes,
              recipientRole: "interviewer",
            });
            emailTasks.push(sendEmail({ to: interviewer.email, subject, html }));
          }

          // Notify candidate (if email exists)
          if (candidate.email) {
            const { subject, html } = getInterviewInviteEmail({
              recipientName: candidateName,
              candidateName,
              jobTitle: "this position",
              companyName: "Vaivamm Capital",
              scheduledAt: dateLabel,
              durationMinutes: body.durationMinutes,
              format: formatLabel,
              notes: body.notes,
              recipientRole: "candidate",
            });
            emailTasks.push(sendEmail({ to: candidate.email, subject, html }));
          }
        }

        // WhatsApp/SMS to candidate if channel selected
        if (body.notifyChannels.whatsapp && candidate.phone) {
          const waBody = `Hi ${candidate.firstName}, your interview at Vaivamm Capital is scheduled for ${dateLabel} (${formatLabel}, ${body.durationMinutes} min). Please be available on time.`;
          emailTasks.push(sendWhatsAppWithSmsFallback(candidate.phone, waBody));
        }

        await Promise.allSettled(emailTasks);
      } catch {
        // Non-blocking — never fail the main request
      }
    })();

    return ok(interview, 201);
  });
}
