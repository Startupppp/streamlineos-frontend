"use client";

import { skipToken, useQuery, type QueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { useCan } from "@/hooks/api/access";
import { entityReferenceKey, type EntityReferenceInput } from "@/hooks/api/chat-entities";
import type { EntityCard } from "@/types/chat";
import type { chatResolvedReferencesContract as ResolvedReferencesContract } from "@/hooks/api/chat-schema/message-schema";

const chatResolvedReferencesContract = lazyContract(() =>
  import("@/hooks/api/chat-schema/message-schema").then((m) => m.chatResolvedReferencesContract),
);

export function seedLinkedRecordPreview(queryClient: QueryClient, card: EntityCard): void {
  queryClient.setQueryData(collaborationQueryKeys.chat.linkedRecordPreview(card.type, card.id), card);
}

type ResolvedReferences = z.infer<typeof ResolvedReferencesContract>;

const RESOLVE_BATCH_LIMIT = 50;
const RESOLVE_COALESCE_MS = 10;

interface ResolveWaiter {
  resolve: (card: EntityCard | null) => void;
  reject: (error: unknown) => void;
}

interface PendingReference {
  reference: EntityReferenceInput;
  waiters: ResolveWaiter[];
}

const pendingResolves = new Map<number, Map<string, PendingReference>>();

function settleChunk(chunk: PendingReference[], data: ResolvedReferences): void {
  const cards = new Map(data.references.map((entry) => [entityReferenceKey(entry), entry.card]));
  for (const pending of chunk) {
    const card = cards.get(entityReferenceKey(pending.reference)) ?? null;
    for (const waiter of pending.waiters) waiter.resolve(card);
  }
}

function flushResolves(channelId: number): void {
  const pending = pendingResolves.get(channelId);
  pendingResolves.delete(channelId);
  if (!pending) return;
  const entries = [...pending.values()].filter((entry) => entry.waiters.length > 0);
  for (let start = 0; start < entries.length; start += RESOLVE_BATCH_LIMIT) {
    const chunk = entries.slice(start, start + RESOLVE_BATCH_LIMIT);
    apiClient
      .post<ResolvedReferences>(
        `/chat/channels/${channelId}/references/resolve`,
        { refs: chunk.map((entry) => entry.reference) },
        undefined,
        chatResolvedReferencesContract,
      )
      .then((data) => settleChunk(chunk, data))
      .catch((error: unknown) => {
        for (const entry of chunk) for (const waiter of entry.waiters) waiter.reject(error);
      });
  }
}

function resolveReferenceBatched(
  channelId: number,
  reference: EntityReferenceInput,
  signal: AbortSignal,
): Promise<EntityCard | null> {
  return new Promise((resolve, reject) => {
    let pending = pendingResolves.get(channelId);
    if (!pending) {
      pending = new Map();
      pendingResolves.set(channelId, pending);
      setTimeout(() => flushResolves(channelId), RESOLVE_COALESCE_MS);
    }
    const key = entityReferenceKey(reference);
    const entry = pending.get(key) ?? { reference, waiters: [] };
    const waiter: ResolveWaiter = { resolve, reject };
    entry.waiters.push(waiter);
    pending.set(key, entry);
    signal.addEventListener(
      "abort",
      () => {
        entry.waiters = entry.waiters.filter((candidate) => candidate !== waiter);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export function useResolvedReferenceCard(
  channelId: number,
  reference: EntityReferenceInput,
  enabled: boolean,
): EntityCard | null | undefined {
  const canRead = useCan("chat:messages:read");
  const { type, id } = reference;
  return useQuery<EntityCard | null>({
    queryKey: collaborationQueryKeys.chat.referenceCard(channelId, type, id),
    queryFn: ({ signal }) => resolveReferenceBatched(channelId, { type, id }, signal),
    staleTime: 60_000,
    enabled: enabled && canRead && channelId > 0,
  }).data;
}

export function useLinkedRecordPreview(reference: EntityReferenceInput): EntityCard | undefined {
  return useQuery<EntityCard>({
    queryKey: collaborationQueryKeys.chat.linkedRecordPreview(reference.type, reference.id),
    queryFn: skipToken,
    staleTime: Infinity,
  }).data;
}
