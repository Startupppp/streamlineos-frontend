"use client";

import { useQuery } from "@tanstack/react-query";
import { getFeedbucketApiBase, getFeedbucketProjectId } from "@/lib/feedbucket";

const FB_CONFIG_FAIL_KEY = "fb-cfg-fail";

function readFailCache(): boolean {
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(FB_CONFIG_FAIL_KEY) === "0";
  } catch {
    return false;
  }
}

function writeFailCache(): void {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(FB_CONFIG_FAIL_KEY, "0");
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
      if (readFailCache()) return false;
      const response = await fetch(
        `${apiBase}/public/feedbucket/${projectId}/config`,
        { signal },
      );
      if (!response.ok) {
        writeFailCache();
        return false;
      }
      return true;
    },
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  });

  return data === true;
}
