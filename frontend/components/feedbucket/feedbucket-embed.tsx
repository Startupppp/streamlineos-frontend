"use client";

import Script from "next/script";
import {
  FEEDBUCKET_WIDGET_SCRIPT_PATH,
  getFeedbucketApiBase,
  getFeedbucketProjectId,
} from "@/lib/feedbucket";

export function FeedbucketEmbed() {
  const apiBase = getFeedbucketApiBase();
  const projectId = getFeedbucketProjectId();
  if (!apiBase || !projectId) return null;
  return (
    <Script
      id="feedbucket-widget"
      src={FEEDBUCKET_WIDGET_SCRIPT_PATH}
      data-key={projectId}
      data-api={apiBase}
      strategy="lazyOnload"
    />
  );
}
