import { z } from "zod";
import { RECORD_SEARCH_TYPES } from "./linked-record-meta";
import { chatMessageAttachmentContract, chatMessageMetadataContract } from "@/hooks/api/chat-schema/message-schema";
import { orgScopedStorageKey } from "@/lib/org-scoped-storage";

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
    failed: z.boolean().optional(),
  }),
);

export type OutboxEntry = z.infer<typeof outboxSchema>[number];

const OUTBOX_SUFFIX = ":outbox";

function outboxKeyFor(draftKey: string): string {
  return `${draftKey}${OUTBOX_SUFFIX}`;
}

export function chatDraftKey(channelId: number, scope: string): string {
  return orgScopedStorageKey(`chat:draft:${channelId}`, scope);
}

const outboxListeners = new Set<() => void>();

export function subscribeOutbox(listener: () => void): () => void {
  outboxListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    outboxListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
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
  for (const listener of outboxListeners) listener();
}

export function appendOutboxEntry(draftKey: string, entry: OutboxEntry): void {
  const queued = readOutbox(draftKey);
  if (!queued.some((existing) => existing.clientKey === entry.clientKey)) writeOutbox(draftKey, [...queued, entry]);
}

export function removeOutboxEntry(draftKey: string, clientKey: string): void {
  writeOutbox(draftKey, readOutbox(draftKey).filter((queued) => queued.clientKey !== clientKey));
}

export function markOutboxEntryFailed(draftKey: string, clientKey: string): void {
  const queued = readOutbox(draftKey);
  if (queued.some((entry) => entry.clientKey === clientKey))
    writeOutbox(draftKey, queued.map((entry) => (entry.clientKey === clientKey ? { ...entry, failed: true } : entry)));
}

export function requeueOutboxEntry(draftKey: string, clientKey: string): void {
  const queued = readOutbox(draftKey);
  const target = queued.find((entry) => entry.clientKey === clientKey);
  if (target)
    writeOutbox(draftKey, [...queued.filter((entry) => entry !== target), { ...target, failed: false }]);
}

export function isOutboxEntryFailed(draftKey: string, clientKey: string): boolean {
  return readOutbox(draftKey).some((entry) => entry.clientKey === clientKey && entry.failed === true);
}

export function listOutboxChannels(scope: string): Array<{ channelId: number; draftKey: string }> {
  const prefix = orgScopedStorageKey("chat:draft:", scope);
  const channels: Array<{ channelId: number; draftKey: string }> = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix) || !key.endsWith(OUTBOX_SUFFIX)) continue;
    const id = key.slice(prefix.length, -OUTBOX_SUFFIX.length);
    if (/^\d+$/.test(id)) channels.push({ channelId: Number(id), draftKey: key.slice(0, -OUTBOX_SUFFIX.length) });
  }
  return channels;
}
