"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { PortalSettings, PortalPreview } from "@/hooks/api/build/client-portal-management-schema";

const portalSettingsContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-management-schema").then(
    (m) => m.portalSettingsContract,
  ),
);

const portalPreviewContract = lazyContract(() =>
  import("@/hooks/api/build/client-portal-management-schema").then(
    (m) => m.portalPreviewContract,
  ),
);

export function usePortalSettings(projectId: number) {
  return useGatedQuery<PortalSettings>("build:clientvisibility:manage", {
    queryKey: buildWorkQueryKeys.projects.clientPortal.settings(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<PortalSettings>(
        `/build/${projectId}/client-portal/settings`,
        undefined,
        signal,
        portalSettingsContract,
      ),
    enabled: !!projectId,
    staleTime: 30_000,
    retry: false,
    ...INLINE_READ_ERROR,
  });
}

export function usePublishPortal(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["projects", projectId, "client-portal", "publish"],
    mutationFn: () =>
      apiClient.post<PortalSettings>(
        `/build/${projectId}/client-portal/publish`,
        {},
        undefined,
        portalSettingsContract,
      ),
    onSuccess: (updated) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.clientPortal.settings(projectId),
        updated,
      );
      void qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.clientPortal.preview(projectId),
      });
    },
  });
}

export function useUnpublishPortal(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:clientvisibility:manage", {
    mutationKey: ["projects", projectId, "client-portal", "unpublish"],
    mutationFn: () =>
      apiClient.post<PortalSettings>(
        `/build/${projectId}/client-portal/unpublish`,
        {},
        undefined,
        portalSettingsContract,
      ),
    onSuccess: (updated) => {
      qc.setQueryData(
        buildWorkQueryKeys.projects.clientPortal.settings(projectId),
        updated,
      );
      void qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.clientPortal.preview(projectId),
      });
    },
  });
}

export function usePortalPreview(projectId: number) {
  return useGatedQuery<PortalPreview>("build:clientvisibility:manage", {
    queryKey: buildWorkQueryKeys.projects.clientPortal.preview(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<PortalPreview>(
        `/build/${projectId}/client-portal/preview`,
        undefined,
        signal,
        portalPreviewContract,
      ),
    enabled: !!projectId,
    staleTime: 30_000,
    retry: false,
    ...INLINE_READ_ERROR,
  });
}
