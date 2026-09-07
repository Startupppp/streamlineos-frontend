"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const listChannelsContract = lazyContract(() =>
  import("@/hooks/api/inventory/channels-schema").then((m) => m.listChannelsContract),
);
const channelDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/channels-schema").then((m) => m.channelDetailContract),
);
const listPublicationsContract = lazyContract(() =>
  import("@/hooks/api/inventory/channels-schema").then((m) => m.listPublicationsContract),
);
const listTplConnectionsContract = lazyContract(() =>
  import("@/hooks/api/inventory/channels-schema").then((m) => m.listTplConnectionsContract),
);
const tplConnectionDetailContract = lazyContract(() =>
  import("@/hooks/api/inventory/channels-schema").then((m) => m.tplConnectionDetailContract),
);

export type ChannelType = "INTERNAL" | "SHOPIFY" | "WOOCOMMERCE" | "MARKETPLACE" | "B2B" | "THREE_PL";
export type PublicationStatus = "PENDING" | "PUBLISHED" | "FAILED" | "SKIPPED";

export interface Channel {
  id: number;
  orgId: string;
  name: string;
  channelType?: string;
  status?: string;
  safetyBuffer: string | null;
  publishThreshold: string | null;
  warehouseIds: number[] | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Publication {
  id: number;
  orgId: string;
  channelId: number;
  productVariantId: number;
  publishedQty: string;
  availableQty: string;
  status: string;
  error: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PublicationListResponse {
  items: Publication[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ThreePlConnection {
  id: number;
  orgId: string;
  name: string;
  provider: string;
  status?: string;
  externalWarehouseRef: string | null;
  skuMapping: Record<string, string> | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateChannelInput {
  name: string;
  channelType: ChannelType;
  safetyBuffer?: number;
  publishThreshold?: number;
  warehouseIds?: number[];
  status?: string;
}

interface UpdateChannelInput {
  channelId: number;
  name?: string;
  safetyBuffer?: number;
  publishThreshold?: number;
  warehouseIds?: number[];
  status?: string;
}

interface CreateThreePlInput {
  name: string;
  provider: string;
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
    queryFn: ({ signal }) => apiClient.get<Channel[]>("/inventory/channels", undefined, signal, listChannelsContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useChannelPublications(channelId: number, statusFilter?: PublicationStatus) {
  const canView = useCan("inventory:channels:manage");
  return useQuery<PublicationListResponse, Error>({
    queryKey: statusFilter
      ? [...queryKeys.inventory.channelPublications(channelId), statusFilter]
      : queryKeys.inventory.channelPublications(channelId),
    queryFn: ({ signal }) =>
      apiClient.get<PublicationListResponse>(
        `/inventory/channels/${channelId}/publications`,
        statusFilter ? { status: statusFilter } : undefined, signal, listPublicationsContract,
      ),
    enabled: canView && channelId > 0,
    staleTime: 30_000,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useAuthorizedMutation<Channel, Error, CreateChannelInput>("inventory:channels:manage", {
    mutationKey: ["inventory", "channel", "create"],
    mutationFn: (data) => apiClient.post<Channel>("/inventory/channels", data, undefined, channelDetailContract),
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
      apiClient.patch<Channel>(`/inventory/channels/${channelId}`, data, undefined, channelDetailContract),
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
    queryFn: ({ signal }) => apiClient.get<ThreePlConnection[]>("/inventory/3pl/connections", undefined, signal, listTplConnectionsContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useCreateThreePlConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ThreePlConnection, Error, CreateThreePlInput>("inventory:3pl:manage", {
    mutationKey: ["inventory", "3pl", "connection", "create"],
    mutationFn: (data) =>
      apiClient.post<ThreePlConnection>("/inventory/3pl/connections", data, undefined, tplConnectionDetailContract),
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
      apiClient.patch<ThreePlConnection>(`/inventory/3pl/connections/${connectionId}`, data, undefined, tplConnectionDetailContract),
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
