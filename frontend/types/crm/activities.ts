export const ACTIVITY_KINDS = ["call", "email", "meeting", "note", "task"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type ActivityActorKind = "human" | "system";

/** One entry on a timeline, whatever the timeline is anchored to. */
export interface TimelineEntry {
  activityId: string;
  kind: ActivityKind;
  occurredAt: string;
  subject: string | null;
  body: string | null;
  threadId: string | null;
  actorKind: ActivityActorKind;
  actorLabel: string | null;
  actorName: string | null;
  dueAt: string | null;
  completedAt: string | null;
  source: string;
}

export interface TimelinePage {
  data: TimelineEntry[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

/** What a task is about, resolved to something a reader can act on. */
export interface TaskAnchorRef {
  kind: "party" | "deal" | "subject";
  id: string;
  /** Null where the anchor has since been deleted; the task still has to render. */
  name: string | null;
}

/** A timeline entry read by assignee rather than by anchor, so it carries one. */
export interface TaskEntry extends TimelineEntry {
  anchor: TaskAnchorRef | null;
}

export interface TaskPage {
  data: TaskEntry[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

/** Exactly one anchor — never a type-plus-id pair. */
export type TimelineAnchor =
  | { kind: "party"; partyId: string }
  | { kind: "deal"; dealId: string }
  | { kind: "subject"; subjectId: string };

export interface ActivityParticipant {
  activityParticipantId: string;
  partyId: string | null;
  userId: string | null;
  userName: string | null;
  address: string | null;
  role: string;
}

export interface CreateActivityInput {
  kind: ActivityKind;
  partyId?: string;
  dealId?: string;
  subjectId?: string;
  occurredAt?: string;
  subject?: string;
  body?: string;
  threadId?: string;
  dueAt?: string;
  assigneeUserId?: string;
  participants?: Array<{
    partyId?: string;
    userId?: string;
    address?: string;
    role: "from" | "to" | "cc" | "attendee" | "organiser";
  }>;
}
