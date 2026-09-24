import type { QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "./query-keys/build-work";
import { accountingAndSupportQueryKeys } from "./query-keys/accounting-and-support";
import { collaborationQueryKeys } from "./query-keys/collaboration";
import { knowledgeAndSurveysQueryKeys } from "./query-keys/knowledge-and-surveys";

const BUILD_CHANGED = "build:changed";
const BUILD_FOCUS_REFRESH_THROTTLE_MS = 15_000;
const clientChannels = new WeakMap<QueryClient, BroadcastChannel>();
const BUILD_QUERY_PREFIXES = [
  buildWorkQueryKeys.projects.all,
  buildWorkQueryKeys.projectReports.all,
  accountingAndSupportQueryKeys.ticketActivity.all,
  accountingAndSupportQueryKeys.whiteboards.all,
  accountingAndSupportQueryKeys.goals.all,
  knowledgeAndSurveysQueryKeys.roadmap.all,
  collaborationQueryKeys.dashboard.myIssues(),
  collaborationQueryKeys.dashboard.recentProjects(),
  collaborationQueryKeys.dashboard.activeSprintSummary(),
];

function buildCacheChannelName(scope: string): string | undefined {
  if (typeof window === "undefined" || !/^authenticated:[^:]+:[^:]+$/.test(scope))
    return undefined;
  return `streamlineos:build-cache:${scope}`;
}

function openBuildCacheChannel(channelName: string): BroadcastChannel | undefined {
  try {
    return typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel(channelName);
  } catch {
    return undefined;
  }
}

interface BuildCacheSyncMeta {
  permission?: unknown;
  buildCacheSync?: boolean;
}

export function publishBuildCacheChange(
  client: QueryClient,
  scope: string,
  meta: BuildCacheSyncMeta | undefined,
): void {
  if (meta?.buildCacheSync === false) return;
  const permission = meta?.permission;
  if (typeof permission !== "string" || !permission.startsWith("build:")) return;
  const channelName = buildCacheChannelName(scope);
  if (!channelName) return;
  const existingChannel = clientChannels.get(client);
  const channel = existingChannel ?? openBuildCacheChannel(channelName);
  try {
    if (channel) channel.postMessage(BUILD_CHANGED);
    else {
      window.localStorage.setItem(channelName, BUILD_CHANGED);
      window.localStorage.removeItem(channelName);
    }
  } catch {
    // Browser storage restrictions must not turn a committed mutation into a failure.
  } finally {
    if (!existingChannel) channel?.close();
  }
}

export function subscribeBuildCacheSync(client: QueryClient, scope: string): () => void {
  const channelName = buildCacheChannelName(scope);
  if (!channelName) return () => {};

  const channel = openBuildCacheChannel(channelName);
  if (channel) clientChannels.set(client, channel);

  function invalidateBuildQueries() {
    for (const queryKey of BUILD_QUERY_PREFIXES)
      void client.invalidateQueries({ queryKey });
  }

  let lastFocusRefreshAt: number | undefined;

  function refreshActiveBuildQueries() {
    const now = Date.now();
    if (
      lastFocusRefreshAt !== undefined &&
      now - lastFocusRefreshAt < BUILD_FOCUS_REFRESH_THROTTLE_MS
    )
      return;
    lastFocusRefreshAt = now;
    for (const queryKey of BUILD_QUERY_PREFIXES)
      void client.refetchQueries({ queryKey, type: "active" });
  }

  function handleMessage(event: MessageEvent<unknown>) {
    if (event.data === BUILD_CHANGED) invalidateBuildQueries();
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === channelName && event.newValue === BUILD_CHANGED) invalidateBuildQueries();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") refreshActiveBuildQueries();
  }

  channel?.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", refreshActiveBuildQueries);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    if (clientChannels.get(client) === channel) clientChannels.delete(client);
    channel?.removeEventListener("message", handleMessage);
    channel?.close();
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", refreshActiveBuildQueries);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
