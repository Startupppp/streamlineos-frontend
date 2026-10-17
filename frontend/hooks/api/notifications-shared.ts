"use client";

import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { isImpersonating, type QueryParams } from "@/lib/api-client";
import { expectedRequestIdentitySchema, type ExpectedRequestIdentity } from "@/lib/api-request-identity";
import type { NotificationListParams } from "@/types/notifications";

export const SHARED_UNREAD_PARAMS: NotificationListParams = { section: "UNREAD", limit: 20 };
export interface NotificationMutationOwner {
  queryClient: QueryClient;
  identity: ExpectedRequestIdentity;
  signal: AbortSignal;
  isCurrent: () => boolean;
}
export function invalidateNotificationInbox(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.lists() });
  void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.notifications.unreadCount() });
  void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.inbox.all });
}
function subscribeImpersonation(change: () => void) {
  window.addEventListener("impersonation-change", change);
  return () => window.removeEventListener("impersonation-change", change);
}
export function useNotificationInboxInvalidation() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const impersonating = useSyncExternalStore(subscribeImpersonation, isImpersonating, () => false);
  const current = useRef<NotificationMutationOwner | null>(null);
  const identity = useMemo(() => expectedRequestIdentitySchema.safeParse({
    orgId: session?.orgId, userId: session?.user?.id, sessionId: session?.sessionId,
  }), [session?.orgId, session?.user?.id, session?.sessionId]);
  const ownerKey = status !== "unauthenticated" && identity.success && !impersonating
    ? JSON.stringify([identity.data.orgId, identity.data.userId, identity.data.sessionId]) : null;
  useLayoutEffect(() => {
    if (!ownerKey || !identity.success) return;
    const controller = new AbortController();
    const owner: NotificationMutationOwner = {
      queryClient, identity: identity.data, signal: controller.signal,
      isCurrent: () => current.current === owner && !controller.signal.aborted && !isImpersonating(),
    };
    current.current = owner;
    return () => { current.current = null; controller.abort(); };
  }, [ownerKey, queryClient, identity]);

  function captureOwner() {
    const owner = current.current;
    return owner && owner.isCurrent() && ownerKey === JSON.stringify([
      owner.identity.orgId, owner.identity.userId, owner.identity.sessionId,
    ]) ? owner : null;
  }
  function invalidateInbox() {
    const owner = captureOwner();
    if (owner) invalidateNotificationInbox(owner.queryClient);
  }
  return { captureOwner, invalidateInbox, orgId: session?.orgId ?? "", queryClient };
}
export function toStringParams(params: QueryParams): Record<string, string> {
  const entries: Array<[string, unknown]> = Object.entries(params);
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)]));
}
