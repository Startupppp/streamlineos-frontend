import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import {
  getCalendarEvents,
  createCalendarEvent,
} from "@/server/queries/calendar";
import { z } from "zod";

const getSchema = z.object({
  start: z.string(),
  end: z.string(),
});

const postSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  allDay: z.boolean().optional(),
  color: z.string().optional(),
  category: z.string().default("general"),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  attendeeIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  recurringRule: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    let params: z.infer<typeof getSchema>;
    try {
      params = parseQuery(req, getSchema);
    } catch {
      return err("Invalid query params: start and end are required", 400);
    }

    const events = await getCalendarEvents(
      session.orgId,
      session.user.id,
      new Date(params.start),
      new Date(params.end)
    );
    return ok(events);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    let input: z.infer<typeof postSchema>;
    try {
      input = await parseBody(req, postSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const event = await createCalendarEvent({
      orgId: session.orgId,
      createdBy: session.user.id,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      allDay: input.allDay ?? false,
      color: input.color ?? "blue",
      category: input.category,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      attendeeIds: input.attendeeIds ?? [],
      isRecurring: input.isRecurring ?? false,
      recurringRule: input.recurringRule ?? null,
    });
    return ok(event, 201);
  });
}
