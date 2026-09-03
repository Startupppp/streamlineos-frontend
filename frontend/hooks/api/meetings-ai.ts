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

export interface AgendaOutput {
  agenda: string;
  keyTopics: string[];
  suggestedDuration?: string;
  preparationNotes?: string;
  citations: AgendaCitation[];
}

export interface MeetingContextSummary {
  crmContext?: string;
  projectContext?: string;
}

export interface MeetingPrepResult {
  agenda: AgendaOutput;
  context: MeetingContextSummary;
  connectedIntegrations: boolean;
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
  signal?: AbortSignal;
}

export const MEETING_SOURCES_HEADER = "x-ai-sources";

/**
 * Streams `POST /ai/meetings/prep/stream`. Same `calendar:ai:use` permission and
 * same body as the buffered sibling; the agenda arrives as prose the panel can
 * append, and the real sources ride on `x-ai-sources` ahead of the body so a
 * stream the user stops halfway keeps its citations.
 *
 * An options object rather than positional arguments on purpose: the defect this
 * seam already shipped once was an `AbortSignal` that type-checked in the wrong
 * slot and cancelled nothing.
 */
export function streamMeetingPrep({
  onToken,
  signal,
  ...input
}: MeetingPrepStreamRequest): Promise<AiTextStreamResult> {
  return streamAiText({ path: "/ai/meetings/prep/stream", body: input, onToken, signal });
}

export function readMeetingPrepSources(headers: Headers): AgendaCitation[] {
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

/**
 * The buffered agenda call, kept alongside `streamMeetingPrep` because
 * `meeting-prep-panel.tsx` renders a structured `MeetingPrepResult` rather than
 * prose. Adopting the stream there is a panel rewrite, tracked as ticket 11's
 * open box -- removing this hook before that lands only breaks the live surface.
 */
export function useMeetingPrep() {
  return useAuthorizedMutation("calendar:ai:use", {
    mutationKey: ["ai", "meetings", "prep"],
    mutationFn: ({ signal, ...input }: MeetingPrepInput & AiAbortInput) =>
      apiClient.post<MeetingPrepResult>("/ai/meetings/prep", input, { signal }),
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
