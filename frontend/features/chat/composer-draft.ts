import { z } from "zod";
import { RECORD_SEARCH_TYPES } from "./linked-record-meta";
import { chatMessageAttachmentContract, chatMessageMetadataContract } from "@/hooks/api/chat-schema/message-schema";

export const LINKED_RECORD_LIMIT = 10;

const linkedRecordDraftsSchema = z
  .array(
    z.object({
      key: z.string(),
      type: z.enum(RECORD_SEARCH_TYPES),
      id: z.string(),
      title: z.string(),
      subtitle: z.string(),
      href: z.string(),
    }),
  )
  .max(LINKED_RECORD_LIMIT);

export type LinkedRecordDraft = z.infer<typeof linkedRecordDraftsSchema>[number];

export function linksKeyFor(draftKey: string): string {
  return `${draftKey}:links`;
}

export function readDraftText(draftKey: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(draftKey) ?? "";
}

export function readDraftLinks(draftKey: string): LinkedRecordDraft[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(linksKeyFor(draftKey));
  if (!raw) return [];
  try {
    const parsed = linkedRecordDraftsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

const outboxSchema = z.array(
  z.object({
    content: z.string(),
    replyToId: z.number().optional(),
    metadata: chatMessageMetadataContract.optional(),
    attachments: z.array(chatMessageAttachmentContract.omit({ id: true })).optional(),
    mentionedUserIds: z.array(z.string()).optional(),
    clientKey: z.string().min(1),
  }),
);

export type OutboxEntry = z.infer<typeof outboxSchema>[number];

function outboxKeyFor(draftKey: string): string {
  return `${draftKey}:outbox`;
}

export function readOutbox(draftKey: string): OutboxEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(outboxKeyFor(draftKey));
  if (!raw) return [];
  try {
    const parsed = outboxSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function writeOutbox(draftKey: string, entries: OutboxEntry[]): void {
  if (entries.length) localStorage.setItem(outboxKeyFor(draftKey), JSON.stringify(entries));
  else localStorage.removeItem(outboxKeyFor(draftKey));
}

export function appendOutboxEntry(draftKey: string, entry: OutboxEntry): void {
  const queued = readOutbox(draftKey);
  if (!queued.some((existing) => existing.clientKey === entry.clientKey)) writeOutbox(draftKey, [...queued, entry]);
}

export function removeOutboxEntry(draftKey: string, clientKey: string): void {
  writeOutbox(draftKey, readOutbox(draftKey).filter((queued) => queued.clientKey !== clientKey));
}
