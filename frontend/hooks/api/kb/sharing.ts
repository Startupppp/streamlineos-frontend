"use client";
import type { z } from "zod";
import type {
  sharingSettingsContract as SharingSettingsC,
  spaceSharingPolicyContract as SpaceSharingPolicyC,
  shareLinkListContract as ShareLinkListC,
  shareLinkItemContract as ShareLinkItemC,
  shareLinkCreatedContract as ShareLinkCreatedC,
  inventoryPageContract as InventoryPageC,
  bulkRevokeResultContract as BulkRevokeResultC,
  guestGrantResponseContract as GuestGrantResponseC,
  externalSharingModeContract as ExternalSharingModeC,
} from "@/hooks/api/kb/kb-sharing-schema";
import { useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { selectFlatPages } from "@/lib/api/select-flat-pages";

export type SharingSettings = z.infer<typeof SharingSettingsC>;
type SpaceSharingPolicy = z.infer<typeof SpaceSharingPolicyC>;
type ShareLinkList = z.infer<typeof ShareLinkListC>;
type ShareLinkCreated = z.infer<typeof ShareLinkCreatedC>;
export type ShareLinkItem = z.infer<typeof ShareLinkItemC>;
export type InventoryPage = z.infer<typeof InventoryPageC>;
type BulkRevokeResult = z.infer<typeof BulkRevokeResultC>;
type GuestGrantResponse = z.infer<typeof GuestGrantResponseC>;

type ExternalSharingMode = z.infer<typeof ExternalSharingModeC>;

const sharingSettingsC = lazyContract(() =>
  import("@/hooks/api/kb/kb-sharing-schema").then((m) => m.sharingSettingsContract),
);
const spaceSharingPolicyC = lazyContract(() =>
  import("@/hooks/api/kb/kb-sharing-schema").then((m) => m.spaceSharingPolicyContract),
);
const shareLinkListC = lazyContract(() =>
  import("@/hooks/api/kb/kb-sharing-schema").then((m) => m.shareLinkListContract),
);
const shareLinkCreatedC = lazyContract(() =>
  import("@/hooks/api/kb/kb-sharing-schema").then((m) => m.shareLinkCreatedContract),
);
const inventoryPageC = lazyContract(() =>
  import("@/hooks/api/kb/kb-sharing-schema").then((m) => m.inventoryPageContract),
);
const bulkRevokeResultC = lazyContract(() =>
  import("@/hooks/api/kb/kb-sharing-schema").then((m) => m.bulkRevokeResultContract),
);
const guestGrantResponseC = lazyContract(() =>
  import("@/hooks/api/kb/kb-sharing-schema").then((m) => m.guestGrantResponseContract),
);
const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export function useKbSharingSettings() {
  const canManage = useCan("kb:settings:manage");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.sharingSettings(),
    queryFn: ({ signal }) =>
      apiClient.get<SharingSettings>("/kb/settings/sharing", undefined, signal, sharingSettingsC),
    staleTime: 300_000,
    enabled: canManage,
  });
}

export function useUpdateKbSharingSettings() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:settings:manage", {
    mutationKey: ["kb", "sharing", "settings", "update"],
    mutationFn: (data: Partial<SharingSettings>) =>
      apiClient.patch<SharingSettings>("/kb/settings/sharing", data, undefined, sharingSettingsC),
    onSuccess: (updated) => {
      qc.setQueryData(knowledgeAndSurveysQueryKeys.kb.sharingSettings(), updated);
    },
  });
}

export function useKbSpaceSharingPolicy(spaceId: number) {
  const canView = useCan("kb:spaces:view");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.spaceSharingPolicy(spaceId),
    queryFn: ({ signal }) =>
      apiClient.get<SpaceSharingPolicy>(
        `/kb/spaces/${spaceId}/sharing-policy`,
        undefined,
        signal,
        spaceSharingPolicyC,
      ),
    staleTime: 60_000,
    enabled: canView && spaceId > 0,
  });
}

export function useUpdateKbSpaceSharingPolicy(spaceId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:spaces:view", {
    mutationKey: ["kb", "spaces", spaceId, "sharing-policy", "update"],
    mutationFn: (data: { externalSharing: ExternalSharingMode | null }) =>
      apiClient.patch<SpaceSharingPolicy>(
        `/kb/spaces/${spaceId}/sharing-policy`,
        data,
        undefined,
        spaceSharingPolicyC,
      ),
    onSuccess: (updated) => {
      qc.setQueryData(knowledgeAndSurveysQueryKeys.kb.spaceSharingPolicy(spaceId), updated);
    },
  });
}

export function useKbPageShareLinks(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useInfiniteQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageShareLinks(pageId),
    initialPageParam: NO_CURSOR_YET,
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<ShareLinkList>(
        `/kb/pages/${pageId}/share-links`,
        pageParam !== undefined ? { cursor: pageParam } : undefined,
        signal,
        shareLinkListC,
      ),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    select: selectFlatPages,
    staleTime: 30_000,
    enabled: canView && pageId > 0,
  });
}

export function useCreateKbShareLink() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "shareLinks", "create"],
    mutationFn: ({
      pageId,
      expiresAt,
      allowDownload,
    }: {
      pageId: number;
      expiresAt: string;
      allowDownload?: boolean;
    }) =>
      apiClient.post<ShareLinkCreated>(
        `/kb/pages/${pageId}/share-links`,
        { expiresAt, allowDownload },
        undefined,
        shareLinkCreatedC,
      ),
    onSuccess: (created, { pageId }) => {
      const { token: _t, ...item } = created;
      qc.setQueryData<InfiniteData<ShareLinkList>>(
        knowledgeAndSurveysQueryKeys.kb.pageShareLinks(pageId),
        (old) => {
          if (!old?.pages[0]) return old;
          return { ...old, pages: [{ ...old.pages[0], data: [item, ...old.pages[0].data] }, ...old.pages.slice(1)] };
        },
      );
    },
  });
}

export function useRevokeKbShareLink() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "shareLinks", "revoke"],
    mutationFn: ({ pageId, linkId }: { pageId: number; linkId: number }) =>
      apiClient.delete<void>(`/kb/pages/${pageId}/share-links/${linkId}`, undefined, undefined, noContentC),
    onSuccess: (_, { pageId, linkId }) => {
      qc.setQueryData<InfiniteData<ShareLinkList>>(
        knowledgeAndSurveysQueryKeys.kb.pageShareLinks(pageId),
        (old) => old ? { ...old, pages: old.pages.map((pg) => ({ ...pg, data: pg.data.filter((it) => it.id !== linkId) })) } : old,
      );
    },
  });
}

export function useRotateKbShareLink() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "shareLinks", "rotate"],
    mutationFn: ({ pageId, linkId }: { pageId: number; linkId: number }) =>
      apiClient.post<ShareLinkCreated>(`/kb/pages/${pageId}/share-links/${linkId}/rotate`, {}, undefined, shareLinkCreatedC),
    onSuccess: (rotated, { pageId, linkId }) => {
      const { token: _t, ...item } = rotated;
      qc.setQueryData<InfiniteData<ShareLinkList>>(
        knowledgeAndSurveysQueryKeys.kb.pageShareLinks(pageId),
        (old) => old ? { ...old, pages: old.pages.map((pg) => ({ ...pg, data: pg.data.map((it) => it.id === linkId ? { ...it, ...item } : it) })) } : old,
      );
    },
  });
}

export function useCreateKbGuestGrant() {
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "guestGrants", "create"],
    mutationFn: ({
      pageId,
      email,
      expiresAt,
      allowDownload,
    }: {
      pageId: number;
      email: string;
      expiresAt: string;
      allowDownload?: boolean;
    }) =>
      apiClient.post<GuestGrantResponse>(
        `/kb/pages/${pageId}/guest-grants`,
        { email, expiresAt, allowDownload },
        undefined,
        guestGrantResponseC,
      ),
  });
}

export type SharingInventoryQuery = {
  type?: "all" | "guest" | "link";
  spaceId?: number;
  status?: "active" | "expired" | "policy_blocked";
};

function buildInventoryParams(q: SharingInventoryQuery): Record<string, string | number> {
  const p: Record<string, string | number> = {};
  if (q.type !== undefined) p.type = q.type;
  if (q.spaceId !== undefined) p.spaceId = q.spaceId;
  if (q.status !== undefined) p.status = q.status;
  return p;
}

export function useKbSharingInventoryPage(query: SharingInventoryQuery = {}, cursor?: string) {
  const canManage = useCan("kb:settings:manage");
  const params = buildInventoryParams(query);
  const queryParams = Object.keys(params).length > 0 ? params : undefined;
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.sharingInventoryPage(queryParams, cursor),
    queryFn: ({ signal }) =>
      apiClient.get<InventoryPage>("/kb/sharing/inventory",
        { ...params, limit: 50, ...(cursor !== undefined ? { cursor } : {}) }, signal, inventoryPageC),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useBulkRevokeKbSharing() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:settings:manage", {
    mutationKey: ["kb", "sharing", "bulk-revoke"],
    mutationFn: (items: Array<{ type: "guest" | "link"; id: number }>) =>
      apiClient.post<BulkRevokeResult>(
        "/kb/sharing/revoke",
        { items },
        undefined,
        bulkRevokeResultC,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.sharingInventory() });
    },
  });
}
