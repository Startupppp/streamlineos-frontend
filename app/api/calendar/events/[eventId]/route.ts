import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import {
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/server/queries/calendar";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  allDay: z.boolean().optional(),
  color: z.string().nullable().optional(),
  category: z.string().optional(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  attendeeIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  recurringRule: z.string().nullable().optional(),
  agenda: z.string().nullable().optional(),
  postMeetingNotes: z.string().nullable().optional(),
  linkedDealId: z.number().int().nullable().optional(),
  linkedLeadId: z.number().int().nullable().optional(),
});

type Ctx = { params: Promise<{ eventId: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const id = Number(eventId);
  if (!Number.isFinite(id)) return err("Invalid event id", 400);

  return withAuth(async (session) => {
    let input: z.infer<typeof updateSchema>;
    try {
      input = await parseBody(req, updateSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const updateData: Parameters<typeof updateCalendarEvent>[3] = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description ?? null;
    if (input.location !== undefined) updateData.location = input.location ?? null;
    if (input.startDate !== undefined) updateData.startDate = new Date(input.startDate);
    if (input.endDate !== undefined) updateData.endDate = new Date(input.endDate);
    if (input.allDay !== undefined) updateData.allDay = input.allDay;
    if (input.color !== undefined) updateData.color = input.color ?? null;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.entityType !== undefined) updateData.entityType = input.entityType ?? null;
    if (input.entityId !== undefined) updateData.entityId = input.entityId ?? null;
    if (input.attendeeIds !== undefined) updateData.attendeeIds = input.attendeeIds;
    if (input.isRecurring !== undefined) updateData.isRecurring = input.isRecurring;
    if (input.recurringRule !== undefined) updateData.recurringRule = input.recurringRule ?? null;
    if (input.agenda !== undefined) updateData.agenda = input.agenda ?? null;
    if (input.postMeetingNotes !== undefined) updateData.postMeetingNotes = input.postMeetingNotes ?? null;
    if (input.linkedDealId !== undefined) updateData.linkedDealId = input.linkedDealId ?? null;
    if (input.linkedLeadId !== undefined) updateData.linkedLeadId = input.linkedLeadId ?? null;

    const event = await updateCalendarEvent(id, session.orgId, session.user.id, updateData);
    if (!event) return err("Event not found or not authorized", 404);
    return ok(event);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const id = Number(eventId);
  if (!Number.isFinite(id)) return err("Invalid event id", 400);

  return withAuth(async (session) => {
    await deleteCalendarEvent(id, session.orgId, session.user.id);
    return ok({ deleted: true });
  });
}
