import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import {
  getCalendarEvents,
  createCalendarEvent,
  getOooConflicts,
} from "@/server/queries/calendar";
import { z, ZodError } from "zod";

const getSchema = z.object({
  start: z.string(),
  end: z.string(),
});

const postSchema = z.object({
  title: z
    .string()
    .min(2, "Event title must be at least 2 characters")
    .max(100, "Event title must be at most 100 characters")
    .refine((v) => /^[a-zA-Z0-9]/.test(v.trim()), "Event title must start with a letter or number")
    .refine((v) => !/\s{2,}/.test(v), "Event title cannot have consecutive spaces"),
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
  agenda: z.string().optional(),
  linkedDealId: z.number().int().optional(),
  linkedLeadId: z.number().int().optional(),
}).refine(
  (v) => {
    const start = new Date(v.startDate);
    const end = new Date(v.endDate);
    return (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end > start
    );
  },
  { message: "End date must be after start date", path: ["endDate"] },
);

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    let params: z.infer<typeof getSchema>;
    try {
      params = parseQuery(req, getSchema);
    } catch {
      return err("Invalid query params: start and end are required", 400);
    }

    try {
      const key = `calendar:events:${session.orgId}:${session.user.id}:${params.start}:${params.end}`;
      const events = await cached(
        key,
        () =>
          getCalendarEvents(
            session.orgId,
            session.user.id,
            new Date(params.start),
            new Date(params.end),
          ),
        { ttlSeconds: CACHE_TTL.SHORT },
      );
      return ok(events);
    } catch (error) {
      return err(
        "Failed to load calendar events",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    let input: z.infer<typeof postSchema>;
    try {
      input = await parseBody(req, postSchema);
    } catch (error) {
      if (error instanceof ZodError) {
        return err(error.issues[0]?.message ?? "Invalid request body", 400);
      }
      return err("Invalid request body", 400);
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    const [event, oooConflicts] = await Promise.all([
      createCalendarEvent({
        orgId: session.orgId,
        createdBy: session.user.id,
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        startDate,
        endDate,
        allDay: input.allDay ?? false,
        color: input.color ?? "blue",
        category: input.category,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        attendeeIds: input.attendeeIds ?? [],
        isRecurring: input.isRecurring ?? false,
        recurringRule: input.recurringRule ?? null,
        agenda: input.agenda ?? null,
        linkedDealId: input.linkedDealId ?? null,
        linkedLeadId: input.linkedLeadId ?? null,
      }),
      getOooConflicts(session.orgId, input.attendeeIds ?? [], startDate, endDate),
    ]);

    await invalidateCachePattern(`calendar:events:${session.orgId}:*`);

    return ok({ event, oooConflicts }, 201);
  });
}
