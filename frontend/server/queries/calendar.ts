"server-only";
import { db } from "@/lib/db";
import { calendarEvents, leaveRequests, interviews, users, tasks, eventAttendees, holidays } from "@/lib/db/schema";
import { eq, and, gte, lte, isNotNull, inArray } from "drizzle-orm";

export interface CalendarEventItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string | null;
  category: string;
  source: "event" | "leave" | "interview" | "task" | "holiday";
  location?: string | null;
  description?: string | null;
  creatorName?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  myRsvpStatus?: string | null;
}

export async function getCalendarEvents(
  orgId: string,
  userId: string,
  start: Date,
  end: Date
): Promise<CalendarEventItem[]> {
  const [eventsData, leavesData, interviewsData, tasksData, holidaysData] = await Promise.all([
    db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.orgId, orgId),
        gte(calendarEvents.startDate, start),
        lte(calendarEvents.startDate, end)
      ),
      with: { creator: { columns: { name: true } } },
      orderBy: (t, { asc }) => [asc(t.startDate)],
    }),

    db
      .select({
        id: leaveRequests.id,
        userId: leaveRequests.userId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        userName: users.name,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(leaveRequests.userId, users.id))
      .where(
        and(
          eq(leaveRequests.orgId, orgId),
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, end.toISOString().slice(0, 10)),
          gte(leaveRequests.endDate, start.toISOString().slice(0, 10))
        )
      ),

    db
      .select({
        id: interviews.id,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        type: interviews.type,
        interviewerId: interviews.interviewerId,
        location: interviews.location,
        meetingLink: interviews.meetingLink,
      })
      .from(interviews)
      .where(
        and(
          eq(interviews.orgId, orgId),
          gte(interviews.scheduledAt, start),
          lte(interviews.scheduledAt, end)
        )
      ),

    db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        status: tasks.status,
        assigneeId: tasks.assigneeId,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, orgId),
          isNotNull(tasks.dueDate),
          gte(tasks.dueDate, start),
          lte(tasks.dueDate, end)
        )
      ),

    db
      .select({
        id: holidays.id,
        name: holidays.name,
        date: holidays.date,
        message: holidays.message,
      })
      .from(holidays)
      .where(
        and(
          eq(holidays.orgId, orgId),
          gte(holidays.date, start.toISOString().slice(0, 10)),
          lte(holidays.date, end.toISOString().slice(0, 10))
        )
      ),
  ]);

  const eventIds = eventsData.map((e) => e.id);
  const rsvpMap = new Map<number, string>();
  if (eventIds.length > 0) {
    const attendeeRows = await db
      .select({ eventId: eventAttendees.eventId, status: eventAttendees.status })
      .from(eventAttendees)
      .where(
        and(
          eq(eventAttendees.userId, userId),
          inArray(eventAttendees.eventId, eventIds)
        )
      );
    for (const row of attendeeRows) {
      rsvpMap.set(row.eventId, row.status ?? "pending");
    }
  }

  const result: CalendarEventItem[] = [];

  for (const ev of eventsData) {
    result.push({
      id: `event-${ev.id}`,
      title: ev.title,
      start: ev.startDate,
      end: ev.endDate,
      allDay: ev.allDay ?? false,
      color: ev.color,
      category: ev.category,
      source: "event",
      location: ev.location,
      description: ev.description,
      creatorName: ev.creator?.name ?? null,
      entityId: ev.entityId,
      entityType: ev.entityType,
      myRsvpStatus: rsvpMap.get(ev.id) ?? null,
    });
  }

  for (const lv of leavesData) {
    result.push({
      id: `leave-${lv.id}`,
      title: `${lv.userName ?? "Employee"} — OOO`,
      start: new Date(lv.startDate),
      end: new Date(lv.endDate),
      allDay: true,
      color: "green",
      category: "leave",
      source: "leave",
      description: lv.reason ?? null,
      creatorName: lv.userName ?? null,
    });
  }

  for (const iv of interviewsData) {
    const end = new Date(iv.scheduledAt);
    end.setMinutes(end.getMinutes() + (iv.duration ?? 60));
    result.push({
      id: `interview-${iv.id}`,
      title: `Interview (${iv.type ?? "Video"})`,
      start: iv.scheduledAt,
      end,
      allDay: false,
      color: "orange",
      category: "interview",
      source: "interview",
      location: iv.location ?? iv.meetingLink ?? null,
    });
  }

  for (const tk of tasksData) {
    if (!tk.dueDate) continue;
    result.push({
      id: `task-${tk.id}`,
      title: tk.title,
      start: tk.dueDate,
      end: tk.dueDate,
      allDay: true,
      color: tk.status === "completed" ? "gray" : "red",
      category: "task",
      source: "task",
    });
  }

  for (const hd of holidaysData) {
    const hdDate = new Date(hd.date);
    result.push({
      id: `holiday-${hd.id}`,
      title: hd.name,
      start: hdDate,
      end: hdDate,
      allDay: true,
      color: "purple",
      category: "holiday",
      source: "holiday",
      description: hd.message ?? null,
    });
  }

  result.sort((a, b) => a.start.getTime() - b.start.getTime());
  return result;
}

export async function getCalendarEvent(id: number, orgId: string) {
  return db.query.calendarEvents.findFirst({
    where: and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, orgId)),
    with: {
      creator: { columns: { name: true } },
    },
  });
}


export async function getOooConflicts(
  orgId: string,
  attendeeIds: string[],
  start: Date,
  end: Date
): Promise<{ userId: string; userName: string | null; leaveStart: string; leaveEnd: string }[]> {
  if (attendeeIds.length === 0) return [];

  const { inArray } = await import("drizzle-orm");
  const conflicts = await db
    .select({
      userId: leaveRequests.userId,
      userName: users.name,
      leaveStart: leaveRequests.startDate,
      leaveEnd: leaveRequests.endDate,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(leaveRequests.userId, users.id))
    .where(
      and(
        eq(leaveRequests.orgId, orgId),
        eq(leaveRequests.status, "APPROVED"),
        inArray(leaveRequests.userId, attendeeIds),
        lte(leaveRequests.startDate, end.toISOString().slice(0, 10)),
        gte(leaveRequests.endDate, start.toISOString().slice(0, 10))
      )
    );

  return conflicts;
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
  agenda?: string | null;
  linkedDealId?: number | null;
  linkedLeadId?: number | null;
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
      agenda: data.agenda ?? null,
      linkedDealId: data.linkedDealId ?? null,
      linkedLeadId: data.linkedLeadId ?? null,
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
    agenda: string | null;
    postMeetingNotes: string | null;
    linkedDealId: number | null;
    linkedLeadId: number | null;
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
