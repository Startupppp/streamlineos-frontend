"use client";

import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AiAbortInput } from "@/hooks/api/ai-abort";
import { streamAiText, type AiTextStreamResult } from "@/hooks/api/ai-text-stream";

export interface MeetingPrepInput {
  eventId: string;
  includeCrmContext?: boolean;
  includeProjectContext?: boolean;
}

export interface AgendaCitation {
  id: string | number;
  title: string;
  snippet?: string;
}

export interface MeetingFollowUpInput {
  eventId: string;
  meetingNotes?: string;
  actionItems?: string[];
}

export interface ActionItem {
  item: string;
  assignee?: string;
  dueDate?: string;
}

export interface FollowUpDraft {
  subject: string;
  body: string;
  actionItems: ActionItem[];
  nextMeetingDate?: string;
}

/**
 * `POST /ai/meetings/follow-up` returns the draft nested under `followUp`
 * alongside the event title. This type used to be the inner draft, so every
 * field the panel read — `subject`, `body`, `actionItems` — was `undefined`
 * and `actionItems.length` threw on the first successful draft.
 */
export interface MeetingFollowUpResult {
  followUp: FollowUpDraft;
  eventTitle: string;
}

export interface ProposeSendInput {
  eventId: string;
  followUpDraft: FollowUpDraft;
  channel: string;
}

export interface ProposeSendResult {
  proposalId: string;
  token: string;
  expiresAt: string;
}

export interface ConfirmSendInput {
  token: string;
}

export interface ConfirmSendResult {
  executed: boolean;
  channel?: string;
  error?: string;
  message?: string;
}

export interface MeetingPrepStreamRequest extends MeetingPrepInput {
  onToken?: (token: string) => void;
  onSources?: (sources: AgendaCitation[]) => void;
  signal?: AbortSignal;
}

export const MEETING_SOURCES_HEADER = "x-ai-sources";
export const MEETING_PREP_STREAM_PATH = "/ai/meetings/prep/stream";

/**
 * Streams `POST /ai/meetings/prep/stream` — the only representation of a prep
 * this frontend asks for. The backend keeps a buffered `POST /ai/meetings/prep`
 * whose product is a Zod-validated record; the panel renders the agenda as it
 * arrives instead, so nothing here calls it.
 *
 * The real sources ride on `x-ai-sources` ahead of the body, so `onSources`
 * fires before the first token and a stream the user stops halfway keeps its
 * citations.
 *
 * An options object rather than positional arguments on purpose: the defect this
 * seam already shipped once was an `AbortSignal` that type-checked in the wrong
 * slot and cancelled nothing.
 */
export function streamMeetingPrep({
  onToken,
  onSources,
  signal,
  ...input
}: MeetingPrepStreamRequest): Promise<AiTextStreamResult> {
  return streamAiText({
    path: MEETING_PREP_STREAM_PATH,
    body: input,
    onToken,
    onHeaders: onSources ? (headers) => onSources(readMeetingSources(headers)) : undefined,
    signal,
  });
}

export function readMeetingSources(headers: Headers): AgendaCitation[] {
  const raw = headers.get(MEETING_SOURCES_HEADER);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is AgendaCitation =>
        typeof c === "object" && c !== null && "id" in c && "title" in c,
    );
  } catch {
    return [];
  }
}

export interface MeetingFollowUpStreamRequest extends MeetingFollowUpInput {
  onToken?: (token: string) => void;
  onSources?: (sources: AgendaCitation[]) => void;
  signal?: AbortSignal;
}

export const MEETING_FOLLOW_UP_STREAM_PATH = "/ai/meetings/follow-up/stream";

/**
 * Streams `POST /ai/meetings/follow-up/stream`. Same shape as
 * `streamMeetingPrep` deliberately: one wire format, one client, one place the
 * abort signal can go wrong. `useMeetingFollowUp` below is NOT deleted — the
 * buffered route's product is a Zod-validated record and other callers may still
 * want one; a previous pass removed a buffered hook before its surface had moved
 * and broke the live panel.
 *
 * The real sources ride on `x-ai-sources` ahead of the body, so `onSources`
 * fires before the first token and a stream the user stops halfway keeps its
 * citations.
 */
export function streamMeetingFollowUp({
  onToken,
  onSources,
  signal,
  ...input
}: MeetingFollowUpStreamRequest): Promise<AiTextStreamResult> {
  return streamAiText({
    path: MEETING_FOLLOW_UP_STREAM_PATH,
    body: input,
    onToken,
    onHeaders: onSources ? (headers) => onSources(readMeetingSources(headers)) : undefined,
    signal,
  });
}

export function useMeetingFollowUp() {
  return useAuthorizedMutation("calendar:ai:use", {
    mutationKey: ["ai", "meetings", "follow-up"],
    mutationFn: ({ signal, ...input }: MeetingFollowUpInput & AiAbortInput) =>
      apiClient.post<MeetingFollowUpResult>("/ai/meetings/follow-up", input, { signal }),
  });
}

export function useProposeMeetingSend() {
  return useAuthorizedMutation("calendar:ai:use", {
    mutationKey: ["ai", "meetings", "follow-up", "propose-send"],
    mutationFn: ({ signal, ...input }: ProposeSendInput & AiAbortInput) =>
      apiClient.post<ProposeSendResult>("/ai/meetings/follow-up/propose-send", input, { signal }),
  });
}

export function useConfirmMeetingSend() {
  return useAuthorizedMutation("calendar:ai:use", {
    mutationKey: ["ai", "meetings", "follow-up", "confirm-send"],
    mutationFn: ({ signal, ...input }: ConfirmSendInput & AiAbortInput) =>
      apiClient.post<ConfirmSendResult>("/ai/meetings/follow-up/confirm-send", input, { signal }),
  });
}
