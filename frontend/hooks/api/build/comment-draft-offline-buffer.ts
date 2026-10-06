import { z } from "zod";
import { orgScopedStorageKey } from "@/lib/org-scoped-storage";
import { newIdempotencyKey } from "@/lib/idempotency-key";
import { ApiError } from "@/lib/api-envelope";

const BUFFER_NAME = "slos:comment-draft-pending:v3";
const BUFFER_LIMIT = 100;
const scopeSchema = z.string().max(300).regex(/^authenticated:[^:\s]+:[^:\s]+$/);
const entrySchema = z.object({
  ticketId: z.number().int().positive().max(2147483647),
  body: z.string().min(1).max(10000),
  revision: z.guid(),
}).strict();
const envelopeSchema = z.object({ version: z.literal(2), scope: scopeSchema, entries: z.array(entrySchema).max(BUFFER_LIMIT) }).strict()
  .refine((envelope) => new Set(envelope.entries.map((entry) => entry.ticketId)).size === envelope.entries.length);
type BufferedCommentDraft = z.infer<typeof entrySchema>;
const commentDraftInputSchema = entrySchema.omit({ revision: true }).strict();
export const draftEditInputSchema = commentDraftInputSchema.extend({ body: z.string().max(10000) }).strict();
const draftIntentSchema = z.discriminatedUnion("kind", [
  entrySchema.extend({ kind: z.literal("upsert") }).strict(),
  entrySchema.omit({ body: true }).extend({ kind: z.literal("delete") }).strict(),
]);
const currentEnvelopeSchema = z.object({ version: z.literal(3), scope: scopeSchema, entries: z.array(draftIntentSchema).max(BUFFER_LIMIT) }).strict()
  .refine((envelope) => new Set(envelope.entries.map((entry) => entry.ticketId)).size === envelope.entries.length);
export type BufferedDraftIntent = z.infer<typeof draftIntentSchema>;
const activeReplays = new Map<string, Promise<void>>();
const activeSaves = new Map<string, Promise<void>>();

function readBuffer(scope: string) {
  if (typeof window === "undefined" || !scopeSchema.safeParse(scope).success) return null;
  const key = orgScopedStorageKey(BUFFER_NAME, scope);
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      if (raw.length > 6100000) return null;
      const result = currentEnvelopeSchema.safeParse(JSON.parse(raw));
      return result.success && result.data.scope === scope ? { key, entries: result.data.entries } : null;
    }
    const prior = localStorage.getItem(orgScopedStorageKey("slos:comment-draft-pending:v2", scope));
    if (prior === null) return { key, entries: [] };
    if (prior.length > 6100000) return null;
    const result = envelopeSchema.safeParse(JSON.parse(prior));
    return result.success && result.data.scope === scope
      ? { key, entries: result.data.entries.map((entry): BufferedDraftIntent => ({ ...entry, kind: "upsert" })) } : null;
  } catch {
    return null;
  }
}

function writeBuffer(key: string, scope: string, entries: BufferedDraftIntent[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ version: 3, scope, entries }));
    return true;
  } catch {
    return false;
  }
}

export function bufferDraft(scope: string, ticketId: number, body: string): BufferedCommentDraft | null {
  const input = commentDraftInputSchema.safeParse({ ticketId, body });
  if (!input.success) return null;
  const entry = stageDraftIntent(scope, ticketId, body);
  return entry?.kind === "upsert" ? { ticketId: entry.ticketId, body: entry.body, revision: entry.revision } : null;
}

export function stageDraftIntent(scope: string, ticketId: number, body: string): BufferedDraftIntent | null {
  const input = draftEditInputSchema.safeParse({ ticketId, body });
  const stored = readBuffer(scope);
  if (!input.success || stored === null) return null;
  const index = stored.entries.findIndex((entry) => entry.ticketId === ticketId);
  if (index === -1 && stored.entries.length >= BUFFER_LIMIT) return null;
  const entry: BufferedDraftIntent = input.data.body.trim()
    ? { ...input.data, revision: newIdempotencyKey(), kind: "upsert" }
    : { ticketId, revision: newIdempotencyKey(), kind: "delete" };
  const entries = [...stored.entries];
  if (index === -1) entries.push(entry);
  else entries[index] = entry;
  return writeBuffer(stored.key, scope, entries) ? entry : null;
}

export function peekBuffer(scope: string): BufferedCommentDraft[] {
  return peekDraftIntents(scope).flatMap((entry) => entry.kind === "upsert" ? [{ ticketId: entry.ticketId, body: entry.body, revision: entry.revision }] : []);
}

export function peekDraftIntents(scope: string): BufferedDraftIntent[] {
  return readBuffer(scope)?.entries ?? [];
}

export function acknowledgeBufferedDraft(scope: string, expected: BufferedCommentDraft): boolean {
  return acknowledgeDraftIntent(scope, { ...expected, kind: "upsert" });
}

export function acknowledgeDraftIntent(scope: string, expected: BufferedDraftIntent): boolean {
  const stored = readBuffer(scope);
  if (!stored || !stored.entries.some((entry) => entry.ticketId === expected.ticketId && entry.revision === expected.revision && entry.kind === expected.kind && (entry.kind !== "upsert" || expected.kind !== "upsert" || entry.body === expected.body))) return false;
  return writeBuffer(stored.key, scope, stored.entries.filter((entry) => entry.ticketId !== expected.ticketId));
}

export async function serializeDraftSave<T>(scope: string, ticketId: number, signal: AbortSignal, save: () => Promise<T>): Promise<T> {
  const key = `${scope}:${ticketId}`;
  const previous = activeSaves.get(key) ?? Promise.resolve();
  const result = previous.then(() => {
    if (signal.aborted) throw new ApiError("Request was cancelled.", undefined, "ABORTED");
    return save();
  });
  const pending = result.then(() => undefined, () => undefined);
  activeSaves.set(key, pending);
  try { return await result; }
  finally { if (activeSaves.get(key) === pending) activeSaves.delete(key); }
}

function waitForReplay(pending: Promise<void>, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (ready: boolean) => { signal.removeEventListener("abort", cancel); resolve(ready); };
    const cancel = () => finish(false);
    if (signal.aborted) { resolve(false); return; }
    signal.addEventListener("abort", cancel, { once: true });
    void pending.then(() => finish(!signal.aborted));
  });
}

export async function replayBufferedDrafts(scope: string, save: (entry: BufferedCommentDraft) => Promise<boolean>, signal: AbortSignal): Promise<void> {
  return replayDraftIntents(scope, (entry) => entry.kind === "upsert"
    ? save({ ticketId: entry.ticketId, body: entry.body, revision: entry.revision }) : Promise.resolve(false), signal);
}

export async function replayDraftIntents(scope: string, save: (entry: BufferedDraftIntent) => Promise<boolean>, signal: AbortSignal): Promise<void> {
  if (!scopeSchema.safeParse(scope).success || signal.aborted) return;
  let active = activeReplays.get(scope);
  while (active) {
    if (!(await waitForReplay(active, signal))) return;
    active = activeReplays.get(scope);
  }
  let release: () => void = () => undefined;
  const lease = new Promise<void>((resolve) => { release = resolve; });
  activeReplays.set(scope, lease);
  try {
    const pending = peekDraftIntents(scope);
    for (const entry of pending) {
      if (signal.aborted) break;
      const current = peekDraftIntents(scope).find((item) => item.ticketId === entry.ticketId);
      if (!current || current.revision !== entry.revision) continue;
      if (!(await save(entry)) || signal.aborted) break;
      acknowledgeDraftIntent(scope, entry);
    }
  } finally {
    activeReplays.delete(scope);
    release();
  }
}
