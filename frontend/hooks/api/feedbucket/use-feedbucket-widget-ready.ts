"use client";

import { useQuery } from "@tanstack/react-query";
import { getFeedbucketApiBase, getFeedbucketProjectId } from "@/lib/feedbucket";

const FB_CONFIG_MISS_PREFIX = "fb-cfg-miss:";
const FB_CONFIG_MISS_TTL_MS = 24 * 60 * 60_000;

function knownMissing(projectId: string): boolean {
  try {
    const at = Number(localStorage.getItem(FB_CONFIG_MISS_PREFIX + projectId));
    return at > 0 && Date.now() - at < FB_CONFIG_MISS_TTL_MS;
  } catch {
    return false;
  }
}

function rememberMissing(projectId: string): void {
  try {
    localStorage.setItem(FB_CONFIG_MISS_PREFIX + projectId, String(Date.now()));
  } catch {
    return;
  }
}

export function useFeedbucketWidgetReady(): boolean {
  const apiBase = getFeedbucketApiBase();
  const projectId = getFeedbucketProjectId();
  const enabled = !!apiBase && !!projectId;

  const { data } = useQuery({
    queryKey: ["feedbucket", "widget-config", projectId],
    queryFn: async ({ signal }) => {
      if (!projectId || knownMissing(projectId)) return false;
      const response = await fetch(
        `${apiBase}/public/feedbucket/${projectId}/config`,
        { signal },
      );
      if (response.status === 404) rememberMissing(projectId);
      return response.ok;
    },
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  });

  return data === true;
}
