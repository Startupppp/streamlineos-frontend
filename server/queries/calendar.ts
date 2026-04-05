"server-only";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function getCalendarEvents(
  orgId: string,
  userId: string,
  start: Date,
  end: Date
) {
  return db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.orgId, orgId),
      gte(calendarEvents.startDate, start),
      lte(calendarEvents.startDate, end)
    ),
    with: {
      creator: { columns: { name: true } },
    },
    orderBy: (t, { asc }) => [asc(t.startDate)],
  });
}

export async function getCalendarEvent(id: number, orgId: string) {
  return db.query.calendarEvents.findFirst({
    where: and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, orgId)),
    with: {
      creator: { columns: { name: true } },
    },
  });
}

export async function createCalendarEvent(data: {
  orgId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  color?: string | null;
  category: string;
  entityType?: string | null;
  entityId?: string | null;
  createdBy: string;
  attendeeIds?: string[];
  isRecurring?: boolean;
  recurringRule?: string | null;
}) {
  const [event] = await db
    .insert(calendarEvents)
    .values({
      orgId: data.orgId,
      title: data.title,
      description: data.description ?? null,
      location: data.location ?? null,
      startDate: data.startDate,
      endDate: data.endDate,
      allDay: data.allDay ?? false,
      color: data.color ?? "blue",
      category: data.category,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      createdBy: data.createdBy,
      attendeeIds: data.attendeeIds ?? [],
      isRecurring: data.isRecurring ?? false,
      recurringRule: data.recurringRule ?? null,
    })
    .returning();
  return event;
}

export async function updateCalendarEvent(
  id: number,
  orgId: string,
  userId: string,
  data: Partial<{
    title: string;
    description: string | null;
    location: string | null;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    color: string | null;
    category: string;
    entityType: string | null;
    entityId: string | null;
    attendeeIds: string[];
    isRecurring: boolean;
    recurringRule: string | null;
  }>
) {
  const [event] = await db
    .update(calendarEvents)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.orgId, orgId),
        eq(calendarEvents.createdBy, userId)
      )
    )
    .returning();
  return event;
}

export async function deleteCalendarEvent(
  id: number,
  orgId: string,
  userId: string
) {
  await db
    .delete(calendarEvents)
    .where(
      and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.orgId, orgId),
        eq(calendarEvents.createdBy, userId)
      )
    );
}
