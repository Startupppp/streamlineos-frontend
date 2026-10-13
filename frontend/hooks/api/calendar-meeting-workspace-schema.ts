import { z } from "zod";
import { calendarSourceActionProposalContract } from "./calendar-source-actions-schema";

export const calendarMeetingContextContract = z.object({
  id: z.string().uuid(),
  contextType: z.enum(["ENTITY", "DOCUMENT", "MAIL", "CHAT", "RECORDING", "TRANSCRIPT"]),
  sourceKey: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  state: z.enum(["AVAILABLE", "UNAVAILABLE", "STALE", "CONSENT_REQUIRED", "EXPIRED", "REVOKED"]),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  href: z.string().nullable(),
  sourceVersion: z.string().nullable(),
  sharedWithGuests: z.boolean(),
  consentStatus: z.enum(["NOT_REQUIRED", "PENDING", "GRANTED", "WITHDRAWN"]),
  staleAt: z.string().datetime().nullable(),
  retentionUntil: z.string().datetime().nullable(),
  failureCode: z.string().nullable(),
  version: z.number().int().positive(),
});

export const calendarMeetingNoteContract = z.object({
  id: z.string().uuid(),
  kind: z.enum(["AGENDA", "NOTE", "DECISION"]),
  content: z.string(),
  sharedWithGuests: z.boolean(),
  authorMembershipId: z.number().int().positive().nullable(),
  version: z.number().int().positive(),
  retentionUntil: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const calendarMeetingDraftContract = z.object({
  id: z.string().uuid(),
  kind: z.enum(["DECISION", "FOLLOW_UP", "ACTION"]),
  content: z.string(),
  ownerMembershipId: z.number().int().positive().nullable(),
  sharedWithGuests: z.boolean(),
  status: z.enum(["DRAFT", "DECLINED", "PROPOSED", "APPLIED", "PARTIAL"]),
  sourceActionProposalId: z.string().uuid().nullable(),
  sourceProposal: calendarSourceActionProposalContract.nullable(),
  sourceOutcome: z.object({
    status: z.enum(["PROPOSED", "APPLYING", "COMPLETED", "PARTIAL", "EXPIRED", "CANCELLED"]),
    steps: z.array(z.object({
      status: z.enum(["PENDING", "DECLINED", "RUNNING", "COMMITTED", "FAILED", "UNCERTAIN"]),
      outcomeCode: z.string().nullable(),
      outcomeMessage: z.string().nullable(),
      receiptRecorded: z.boolean(),
    })),
  }).nullable(),
  version: z.number().int().positive(),
  reviewedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const calendarMeetingWorkspaceContract = z.object({
  id: z.string().uuid(),
  eventId: z.number().int().positive(),
  eventTitle: z.string(),
  eventStartAt: z.string().datetime(),
  eventEndAt: z.string().datetime(),
  agenda: z.string().nullable(),
  version: z.number().int().positive(),
  retentionUntil: z.string().datetime().nullable(),
  recordingConsentStatus: z.enum(["PENDING", "GRANTED", "WITHDRAWN"]),
  recordingConsentAt: z.string().datetime().nullable(),
  contexts: z.array(calendarMeetingContextContract),
  notes: z.array(calendarMeetingNoteContract),
  drafts: z.array(calendarMeetingDraftContract),
  sourceCoverage: z.object({
    available: z.number().int().nonnegative(),
    unavailable: z.number().int().nonnegative(),
    stale: z.number().int().nonnegative(),
    consentRequired: z.number().int().nonnegative(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const calendarMeetingWorkspaceOptionalContract = calendarMeetingWorkspaceContract.nullable();

export type CalendarMeetingWorkspace = z.infer<typeof calendarMeetingWorkspaceContract>;
export type CalendarMeetingContext = z.infer<typeof calendarMeetingContextContract>;
export type CalendarMeetingNote = z.infer<typeof calendarMeetingNoteContract>;
export type CalendarMeetingDraft = z.infer<typeof calendarMeetingDraftContract>;
