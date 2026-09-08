import { z } from "zod";

/**
 * Response contracts for the calendar module.
 * Derived from backend `calendar-response.schemas.ts`.
 * wireDate() → z.string() (ISO strings on the wire).
 * NOT `.strict()`.
 */

/** `calendarEventsResponseSchema` */
export const calendarEventsResponseContract = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      start: z.string(),
      end: z.string(),
      allDay: z.boolean().optional(),
      color: z.string().nullable().optional(),
      category: z.string(),
      source: z.enum(["event", "leave", "interview", "task", "holiday", "attendance"]),
      timezone: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      creatorName: z.string().nullable().optional(),
      entityId: z.string().nullable().optional(),
      entityType: z.string().nullable().optional(),
      myRsvpStatus: z.string().nullable().optional(),
      projectId: z.number().int().nullable().optional(),
    }),
  ),
  failures: z.array(z.object({ key: z.string(), label: z.string() })),
  truncated: z.boolean(),
});

/** `calendarSourcesResponseSchema` */
export const calendarSourcesContract = z.array(
  z.object({
    key: z.string(),
    label: z.string(),
    module: z.string(),
    enabled: z.boolean(),
  }),
);

/** `calendarSourcePreferenceResponseSchema` */
export const calendarSourcePreferenceContract = z.object({
  sourceKey: z.string(),
  enabled: z.boolean(),
});

/** `externalCalendarEventsResponseSchema` */
export const calendarExternalEventsContract = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      connectionId: z.number().int(),
      toolkit: z.enum(["googlecalendar", "outlook"]),
      accountEmail: z.string().nullable(),
      providerEventId: z.string(),
      title: z.string(),
      start: z.string(),
      end: z.string(),
      allDay: z.boolean(),
      location: z.string().nullable(),
      meetingUrl: z.string().nullable(),
      webLink: z.string().nullable(),
    }),
  ),
  errors: z.array(
    z.object({
      connectionId: z.number().int(),
      accountEmail: z.string().nullable(),
      message: z.string(),
    }),
  ),
});

/** `calendarEventDetailSchema` */
export const calendarEventDetailContract = z.object({
  id: z.number().int(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  allDay: z.boolean(),
  timezone: z.string(),
  color: z.string().nullable(),
  category: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  location: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  description: z.string().nullable(),
  creatorName: z.string().nullable(),
  myRsvpStatus: z.string().nullable(),
  linkedTicket: z
    .object({
      id: z.number().int(),
      key: z.string(),
      title: z.string(),
      projectId: z.number().int(),
      status: z.string(),
    })
    .nullable(),
  rrule: z.string().nullable(),
  isRecurring: z.boolean(),
});

/** `calendarAttendeeListResponseSchema` */
export const calendarAttendeesContract = z.array(
  z.object({
    id: z.number().int(),
    status: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }),
  }),
);

/** `calendarRsvpResponseSchema` */
export const calendarRsvpContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  eventId: z.number().int(),
  membershipId: z.number().int(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `calendarDeleteEventResponseSchema` */
export const calendarDeleteEventContract = z.object({ deleted: z.boolean() });

const calendarMutatedEventContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  timezone: z.string(),
  allDay: z.boolean(),
  color: z.string().nullable(),
  category: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  rrule: z.string().nullable(),
  recurrenceEnd: z.string().nullable(),
  localVersion: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `calendarCreateEventResponseSchema` */
export const calendarCreateEventContract = z.object({
  event: calendarMutatedEventContract,
  oooConflicts: z.array(
    z.object({
      userId: z.string(),
      userName: z.string().nullable(),
      leaveStart: z.string(),
      leaveEnd: z.string(),
    }),
  ),
  eventConflicts: z.array(
    z.object({
      eventId: z.number().int(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      nominalStart: z.string(),
      allDay: z.boolean(),
      timezone: z.string(),
      orgId: z.string(),
    }),
  ),
  meetingUrl: z.string().nullable(),
  syncQueued: z.boolean(),
});

/** `calendarUpdateEventResponseSchema` */
export const calendarUpdateEventContract = calendarMutatedEventContract;

/** `calendarOccurrenceExceptionResponseSchema` */
export const calendarOccurrenceExceptionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  eventId: z.number().int(),
  occurrenceStart: z.string(),
  isCancelled: z.boolean(),
  modifiedTitle: z.string().nullable(),
  modifiedStart: z.string().nullable(),
  modifiedEnd: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Org member lightweight contract for calendar member lookup (`GET /org/members`). */
export const calendarMemberListContract = z.array(
  z.object({
    userId: z.string().optional(),
    membershipId: z.number().int().optional(),
    name: z.string().nullable().optional(),
    email: z.string().optional(),
    image: z.string().nullable().optional(),
    status: z.string().optional(),
  }),
);

/** `syncStatusResponseSchema` from `sync-status.schemas.ts` */
export const calendarSyncStatusContract = z.object({
  status: z.enum(["synced", "pending", "in_flight", "failed", "not_synced"]),
  attemptCount: z.number(),
  lastError: z.string().nullable(),
  operation: z.enum(["create", "update", "delete"]).nullable(),
  queuedAt: z.string().nullable(),
  processedAt: z.string().nullable(),
  retryable: z.boolean(),
});

/** `attendanceRowSchema` from `time-attendance-response.schemas.ts` */
export const attendanceLogContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  date: z.string(),
  checkIn: z.string().nullable(),
  checkOut: z.string().nullable(),
  status: z.string(),
  workHours: z.string().nullable(),
  breakHours: z.string(),
  breaks: z.array(
    z.object({ start: z.string(), end: z.string().optional() }),
  ),
  locationData: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      address: z.string().optional(),
    })
    .nullable(),
  isOvertime: z.boolean(),
  autoCheckedOut: z.boolean(),
  createdAt: z.string(),
});

/** `hrCalendarEventSchema` from `helpdesk-response.schemas.ts` — array form */
export const hrCalendarEventListContract = z.array(
  z.object({
    id: z.string(),
    type: z.enum([
      "HOLIDAY",
      "LEAVE",
      "BIRTHDAY",
      "ANNIVERSARY",
      "REVIEW_CYCLE",
      "TRAVEL",
      "INTERVIEW",
    ]),
    title: z.string(),
    date: z.string(),
    endDate: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
);

/** Array of attendance log rows for monthly attendance calls */
export const attendanceLogListContract = z.array(attendanceLogContract);

/** sync-retry response */
export const calendarSyncRetryContract = z.object({ requeued: z.number().int() });

/**
 * `GET /org/members`. NOT `orgMemberListResponseSchema`, which declares
 * `{ userId?, membershipId?, status? }` — `OrgMembersService.listMembers`
 * selects the seven columns below, so the declared shape would strip every one
 * the member picker renders.
 */
export const calendarOrgMembersContract = z.array(
  z.object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
    role: z.string(),
  }),
);

/** `calendarAttendeeListResponseSchema` — `listAttendees` projects id/status/user. */
export const calendarEventAttendeesContract = z.array(
  z.object({
    id: z.number().int(),
    status: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    }),
  }),
);
