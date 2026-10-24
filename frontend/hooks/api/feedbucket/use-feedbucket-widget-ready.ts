"use client";

import { useState, useEffect } from "react";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!apiBase || !projectId || knownMissing(projectId)) return;
    const controller = new AbortController();
    fetch(`${apiBase}/public/feedbucket/${projectId}/config`, { signal: controller.signal })
      .then((response) => {
        if (response.status === 404) rememberMissing(projectId);
        setReady(response.ok);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [apiBase, projectId]);

  return ready;
}
