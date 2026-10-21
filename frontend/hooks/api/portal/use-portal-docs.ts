"use client";

import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { portalApiClient, getPortalToken } from "@/lib/portal-api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const portalDocListItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  kind: z.enum(["document", "spreadsheet", "file"]),
  spaceId: z.number().int().nullable(),
  expiresAt: z.string(),
  allowDownload: z.boolean(),
});

const portalDocPageSchema = z.object({
  data: z.array(portalDocListItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

const portalDocDetailSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  icon: z.string().nullable(),
  coverImage: z.string().nullable(),
  kind: z.enum(["document", "spreadsheet", "file"]),
  content: z
    .union([
      z.record(z.string(), z.unknown()),
      z.array(z.record(z.string(), z.unknown())),
    ])
    .nullable(),
  updatedAt: z.string(),
  allowDownload: z.boolean(),
});

const portalDocDownloadSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string(),
});

export type PortalDocListItem = z.infer<typeof portalDocListItemSchema>;
export type PortalDocDetail = z.infer<typeof portalDocDetailSchema>;

export function usePortalDocsList() {
  return useInfiniteQuery({
    queryKey: directoryAndOwnershipQueryKeys.portal.docs(),
    queryFn: async ({ pageParam }) => {
      const params: Record<string, unknown> = {};
      if (pageParam !== undefined) params["cursor"] = pageParam;
      const raw = await portalApiClient.get<unknown>("/portal/v1/docs/pages", params);
      return portalDocPageSchema.parse(raw);
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: typeof window !== "undefined" && !!getPortalToken(),
    staleTime: 30_000,
  });
}

export function usePortalDocDetail(pageId: number) {
  return useQuery({
    queryKey: directoryAndOwnershipQueryKeys.portal.docDetail(pageId),
    queryFn: async () => {
      const raw = await portalApiClient.get<unknown>(`/portal/v1/docs/pages/${pageId}`);
      return portalDocDetailSchema.parse(raw);
    },
    enabled: typeof window !== "undefined" && !!getPortalToken() && pageId > 0,
    staleTime: 60_000,
  });
}

export function usePortalDocDownloadUrl(pageId: number) {
  return useMutation({
    mutationKey: ["portal", "docs", pageId, "download-url"],
    mutationFn: async () => {
      const raw = await portalApiClient.post<unknown>(
        `/portal/v1/docs/pages/${pageId}/download-url`,
      );
      return portalDocDownloadSchema.parse(raw);
    },
  });
}

export function usePortalDocRecordAccess(pageId: number) {
  return useMutation({
    mutationKey: ["portal", "docs", pageId, "access"],
    mutationFn: async () => {
      await portalApiClient.post<void>(`/portal/v1/docs/pages/${pageId}/access`);
    },
  });
}
