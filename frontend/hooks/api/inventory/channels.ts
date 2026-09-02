"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { SyncStatus } from "@/features/inventory/lib";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
    queryFn: ({ signal }) => apiClient.get<Channel[]>("/inventory/channels", undefined, signal),
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
    queryFn: ({ signal }) =>
      apiClient.get<Publication[]>(
        `/inventory/channels/${channelId}/publications`,
        statusFilter ? { status: statusFilter } : undefined, signal,
      ),
    enabled: canView && channelId > 0,
    staleTime: 30_000,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useAuthorizedMutation<Channel, Error, CreateChannelInput>("inventory:channels:manage", {
    mutationKey: ["inventory", "channel", "create"],
    mutationFn: (data) => apiClient.post<Channel>("/inventory/channels", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channels() });
    },
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useAuthorizedMutation<Channel, Error, UpdateChannelInput>("inventory:channels:manage", {
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
  return useAuthorizedMutation<unknown, Error, number>("inventory:channels:manage", {
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
  return useAuthorizedMutation<unknown, Error, number>("inventory:channels:manage", {
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
    queryFn: ({ signal }) => apiClient.get<ThreePlConnection[]>("/inventory/3pl/connections", undefined, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useCreateThreePlConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ThreePlConnection, Error, CreateThreePlInput>("inventory:3pl:manage", {
    mutationKey: ["inventory", "3pl", "connection", "create"],
    mutationFn: (data) =>
      apiClient.post<ThreePlConnection>("/inventory/3pl/connections", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.threePlConnections() });
    },
  });
}

export function useUpdateThreePlConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ThreePlConnection, Error, UpdateThreePlInput>("inventory:3pl:manage", {
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
  return useAuthorizedMutation<unknown, Error, number>("inventory:3pl:manage", {
    mutationKey: ["inventory", "3pl", "connection", "sync"],
    mutationFn: (connectionId) =>
      apiClient.post<unknown>(`/inventory/3pl/connections/${connectionId}/sync`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.threePlConnections() });
    },
  });
}
