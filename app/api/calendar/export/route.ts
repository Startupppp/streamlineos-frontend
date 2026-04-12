import { type NextRequest, NextResponse } from "next/server";
import { withAuth, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { format } from "date-fns";

const querySchema = z.object({
  from: z.string(),
  to: z.string(),
});

function toIcsDatetime(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  // RFC 5545: fold lines longer than 75 octets
  const MAX = 75;
  if (line.length <= MAX) return line;

  const chunks: string[] = [];
  let i = 0;
  chunks.push(line.slice(i, i + MAX));
  i += MAX;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + MAX - 1));
    i += MAX - 1;
  }
  return chunks.join("\r\n");
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    let params: z.infer<typeof querySchema>;
    try {
      params = parseQuery(req, querySchema);
    } catch {
      return err("Invalid query params: from and to are required (YYYY-MM-DD)", 400);
    }

    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return err("Invalid date format: use YYYY-MM-DD", 400);
    }

    const events = await db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.orgId, session.orgId),
        gte(calendarEvents.startDate, fromDate),
        lte(calendarEvents.startDate, toDate)
      ),
      orderBy: (t, { asc }) => [asc(t.startDate)],
    });

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Vaivamm Capital CRM//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const event of events) {
      lines.push("BEGIN:VEVENT");
      lines.push(foldLine(`UID:${event.id}@vaivamm`));
      lines.push(foldLine(`DTSTART:${toIcsDatetime(event.startDate)}`));
      lines.push(foldLine(`DTEND:${toIcsDatetime(event.endDate)}`));
      lines.push(foldLine(`DTSTAMP:${toIcsDatetime(new Date())}`));
      lines.push(foldLine(`SUMMARY:${escapeIcsText(event.title)}`));
      if (event.description) {
        lines.push(foldLine(`DESCRIPTION:${escapeIcsText(event.description)}`));
      }
      if (event.location) {
        lines.push(foldLine(`LOCATION:${escapeIcsText(event.location)}`));
      }
      if (event.recurringRule) {
        lines.push(foldLine(`RRULE:${event.recurringRule}`));
      }
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const icsContent = lines.join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="calendar.ics"',
        "Cache-Control": "no-store",
      },
    }) as NextResponse<never>;
  });
}
