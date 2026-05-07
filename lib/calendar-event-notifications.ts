"server-only";

import { format } from "date-fns";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

function formatRange(start: Date, end: Date, allDay: boolean) {
  if (allDay) {
    return `${format(start, "MMM d, yyyy")} (all day)`;
  }
  return `${format(start, "MMM d, yyyy h:mm a")} – ${format(end, "h:mm a")}`;
}

export async function sendCalendarEventAttendeeEmails(params: {
  creatorUserId: string;
  attendeeIds: string[];
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string | null;
  variant: "created" | "updated";
}) {
  const ids = [...new Set(params.attendeeIds)].filter(
    (id) => id && id !== params.creatorUserId
  );
  if (ids.length === 0) return;

  const [creator, attendees] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, params.creatorUserId),
      columns: { name: true, email: true },
    }),
    db.query.users.findMany({
      where: inArray(users.id, ids),
      columns: { id: true, email: true, name: true },
    }),
  ]);

  const organizer = creator?.name?.trim() || creator?.email || "Someone";
  const when = formatRange(params.startDate, params.endDate, params.allDay);
  const subject =
    params.variant === "updated"
      ? `Calendar update: ${params.title}`
      : `Invitation: ${params.title}`;

  for (const u of attendees) {
    if (!u.email) continue;
    const loc =
      params.location?.trim() ?
        `<p><strong>Location:</strong> ${escapeHtml(params.location.trim())}</p>`
        : "";
    const html = `
      <p>${escapeHtml(organizer)} ${params.variant === "updated" ? "updated an event" : "invited you to"} <strong>${escapeHtml(params.title)}</strong>.</p>
      <p><strong>When:</strong> ${escapeHtml(when)}</p>
      ${loc}
      <p style="margin-top:16px;color:#666;font-size:12px">Open your CRM calendar for details.</p>
    `;
    await sendEmail({ to: u.email, subject, html }).catch(() => {});
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
