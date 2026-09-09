"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { SyncStatus } from "@/features/inventory/lib";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

export type ChannelType = "INTERNAL" | "SHOPIFY" | "WOOCOMMERCE" | "MARKETPLACE" | "B2B" | "THREE_PL";
type ChannelStatus = "ACTIVE" | "PAUSED";
export type PublicationStatus = "PENDING" | "PUBLISHED" | "FAILED" | "SKIPPED";

export interface Channel {
  id: number;
  orgId: string;
  name: string;
  channelType: ChannelType;
  status: ChannelStatus;
  safetyBuffer: number | null;
  publishThreshold: number | null;
  warehouseIds: number[];
  lastSyncStatus: SyncStatus | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Publication {
  id: number;
  channelId: number;
  variantId: number;
  variantName: string;
  status: PublicationStatus;
  errorMessage: string | null;
  syncedAt: string | null;
  createdAt: string;
}

export interface ThreePlConnection {
  id: number;
  orgId: string;
  name: string;
  providerKey: string;
  isActive: boolean;
  lastSyncStatus: SyncStatus | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  config?: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateChannelInput {
  name: string;
  channelType: ChannelType;
  safetyBuffer?: number;
  publishThreshold?: number;
  warehouseIds?: number[];
  status?: ChannelStatus;
}

interface UpdateChannelInput {
  channelId: number;
  name?: string;
  safetyBuffer?: number;
  publishThreshold?: number;
  warehouseIds?: number[];
  status?: ChannelStatus;
}

interface CreateThreePlInput {
  name: string;
  providerKey: string;
  config?: Record<string, string>;
}

interface UpdateThreePlInput {
  connectionId: number;
  name?: string;
  isActive?: boolean;
  config?: Record<string, string>;
}

export function useChannels() {
  const canView = useCan("inventory:channels:manage");
  return useQuery<Channel[], Error>({
    queryKey: queryKeys.inventory.channels(),
    queryFn: () => apiClient.get<Channel[]>("/inventory/channels"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useChannelPublications(channelId: number, statusFilter?: PublicationStatus) {
  const canView = useCan("inventory:channels:manage");
  return useQuery<Publication[], Error>({
    queryKey: statusFilter
      ? [...queryKeys.inventory.channelPublications(channelId), statusFilter]
      : queryKeys.inventory.channelPublications(channelId),
    queryFn: () =>
      apiClient.get<Publication[]>(
        `/inventory/channels/${channelId}/publications`,
        statusFilter ? { status: statusFilter } : undefined,
      ),
    enabled: canView && channelId > 0,
    staleTime: 30_000,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useIdempotentMutation<Channel, Error, CreateChannelInput>({
    mutationKey: ["inventory", "channel", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<Channel>("/inventory/channels", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channels() });
    },
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation<Channel, Error, UpdateChannelInput>({
    mutationKey: ["inventory", "channel", "update"],
    mutationFn: ({ channelId, ...data }) =>
      apiClient.patch<Channel>(`/inventory/channels/${channelId}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channels() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channel(vars.channelId) });
    },
  });
}

export function useSyncChannelStock() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationKey: ["inventory", "channel", "sync-stock"],
    mutationFn: (channelId) =>
      apiClient.post<unknown>(`/inventory/channels/${channelId}/sync-stock`, {}),
    onSuccess: (_, channelId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channels() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channelPublications(channelId) });
    },
  });
}

export function useRetryChannelPublications() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationKey: ["inventory", "channel", "publications", "retry"],
    mutationFn: (channelId) =>
      apiClient.post<unknown>(`/inventory/channels/${channelId}/publications/retry`, {}),
    onSuccess: (_, channelId) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channelPublications(channelId) });
    },
  });
}

export function useThreePlConnections() {
  const canView = useCan("inventory:3pl:manage");
  return useQuery<ThreePlConnection[], Error>({
    queryKey: queryKeys.inventory.threePlConnections(),
    queryFn: () => apiClient.get<ThreePlConnection[]>("/inventory/3pl/connections"),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useCreateThreePlConnection() {
  const qc = useQueryClient();
  return useIdempotentMutation<ThreePlConnection, Error, CreateThreePlInput>({
    mutationKey: ["inventory", "3pl", "connection", "create"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<ThreePlConnection>("/inventory/3pl/connections", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.threePlConnections() });
    },
  });
}

export function useUpdateThreePlConnection() {
  const qc = useQueryClient();
  return useMutation<ThreePlConnection, Error, UpdateThreePlInput>({
    mutationKey: ["inventory", "3pl", "connection", "update"],
    mutationFn: ({ connectionId, ...data }) =>
      apiClient.patch<ThreePlConnection>(`/inventory/3pl/connections/${connectionId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.threePlConnections() });
    },
  });
}

export function useSyncThreePlConnection() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationKey: ["inventory", "3pl", "connection", "sync"],
    mutationFn: (connectionId) =>
      apiClient.post<unknown>(`/inventory/3pl/connections/${connectionId}/sync`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.threePlConnections() });
    },
  });
}

/**
 * E6 — what the marketplace thinks it holds, against what the ledger says.
 *
 * Three routes, none of them called from this repo, so a channel snapshot
 * difference could be produced by the nightly sweep and never seen. That is the
 * signal that a listing is oversold or that a sync silently stopped.
 *
 * Reading is `inventory:channels:manage`. **Accepting** is `inventory:stock:adjust`
 * — deliberately a different key, because accepting posts a stock movement whose
 * only justification is that a marketplace disagreed with us, and whoever
 * administers a connection is not automatically somebody who may correct the
 * ledger. Dismissing stays on the channel key, because it touches nothing.
 */
export type SnapshotDiffStatus = "OPEN" | "ACCEPTED" | "DISMISSED";

export interface ChannelSnapshotDiff {
  id: number;
  externalSku: string | null;
  productVariantId: number | null;
  channelQty: string;
  internalQty: string;
  difference: string;
  status: SnapshotDiffStatus;
  snapshotAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  stockTransactionId: number | null;
}

export interface ChannelSnapshotDiffsResult {
  items: ChannelSnapshotDiff[];
  total: number;
  page: number;
  totalPages: number;
  /** So a screen renders "accepting is not permitted here" rather than a button that 409s. */
  snapshotPolicy: string;
}

export function useChannelSnapshotDiffs(
  channelId: number | null,
  filters?: { status?: SnapshotDiffStatus; page?: number; limit?: number },
) {
  const canManage = useCan("inventory:channels:manage");
  return useQuery<ChannelSnapshotDiffsResult, Error>({
    queryKey: queryKeys.inventoryChannelSnapshots.diffs(
      channelId ?? 0,
      filters as Record<string, unknown>,
    ),
    queryFn: () =>
      apiClient.get<ChannelSnapshotDiffsResult>(
        `/inventory/channels/${channelId ?? 0}/snapshot-differences`,
        {
          ...(filters?.status ? { status: filters.status } : {}),
          ...(filters?.page ? { page: String(filters.page) } : {}),
          ...(filters?.limit ? { limit: String(filters.limit) } : {}),
        },
      ),
    staleTime: 30_000,
    enabled: canManage && channelId !== null,
  });
}

function useResolveSnapshotDiff(action: "accept" | "dismiss") {
  const qc = useQueryClient();
  return useIdempotentMutation<
    ChannelSnapshotDiff,
    Error,
    { channelId: number; diffId: number; note: string }
  >({
    mutationKey: ["inventory", "channels", "snapshot-difference", action],
    mutationFn: ({ diffId, note }, idempotencyKey) =>
      apiClient.post<ChannelSnapshotDiff>(
        `/inventory/channels/snapshot-differences/${diffId}/${action}`,
        { note },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.inventoryChannelSnapshots.channel(variables.channelId),
      });
      if (action === "accept") {
        void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevelsList });
        void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockTransactionsList });
      }
    },
  });
}

export function useAcceptSnapshotDiff() {
  return useResolveSnapshotDiff("accept");
}

export function useDismissSnapshotDiff() {
  return useResolveSnapshotDiff("dismiss");
}
