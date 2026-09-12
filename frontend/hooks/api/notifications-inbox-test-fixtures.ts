import { QueryClientProvider } from "@tanstack/react-query";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import type { Notification } from "@/types/notifications";
import type {
  NotificationInboxItem,
  UnifiedInboxItem,
  UnifiedInboxResponse,
} from "@/types/inbox";

/**
 * The harness the notification-inbox specs share. `makeNotif` was once the
 * pre-inbox wire shape behind an `as Notification`: it carried eight fields the
 * type has not had for some time (isArchived, readAt, actionUrl, referenceType,
 * referenceId, actorId, actorName, actorAvatar) and omitted five it requires
 * (priority, category, sourceModule, link, channel). The cast is gone, so the
 * compiler holds it to the real shape.
 */
export function makeNotif(id: number, isRead = false): Notification {
  return {
    id,
    orgId: "org-1",
    userId: "u-1",
    type: "INFO",
    priority: "NORMAL",
    category: "SYSTEM",
    sourceModule: null,
    title: `Notification ${id}`,
    message: null,
    link: null,
    isRead,
    pinned: false,
    channel: "IN_APP",
    archivedAt: null,
    snoozedUntil: null,
    createdAt: new Date().toISOString(),
  };
}

export function makeInfiniteData(
  pages: Notification[][],
): InfiniteData<Notification[]> {
  return {
    pages,
    pageParams: pages.map((_, i) => (i === 0 ? undefined : i)),
  };
}

export function makeUnifiedNotif(id: number, isRead = false): NotificationInboxItem {
  return {
    kind: "notification",
    id,
    notifType: "INFO",
    priority: "NORMAL",
    category: "SYSTEM",
    eventKey: null,
    body: "",
    pinned: false,
    sourceModule: "notifications",
    actor: null,
    subject: `Notification ${id}`,
    timestamp: "2026-01-01T00:00:00.000Z",
    isRead,
    deepLink: null,
    dedupKey: `notification:${id}`,
  };
}

export function makeUnifiedPage(items: UnifiedInboxItem[]): UnifiedInboxResponse {
  return {
    items,
    hasMore: false,
    nextCursor: null,
    sources: [],
    degraded: false,
  };
}

export function makeUnifiedInfiniteData(
  pages: UnifiedInboxResponse[],
): InfiniteData<UnifiedInboxResponse> {
  return {
    pages,
    pageParams: pages.map((_, i) => (i === 0 ? undefined : String(i))),
  };
}

export function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isJestMock(value: unknown): value is jest.Mock {
  return typeof value === "function" && "mock" in value;
}

export type NotificationApiClientMock = {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

/**
 * Narrowed rather than asserted, so a spec that forgets its `jest.mock` fails
 * with a named cause instead of reading `undefined.mockRejectedValueOnce`.
 */
export function apiClientMock(): NotificationApiClientMock {
  const mocked = jest.requireMock("@/lib/api-client");
  const client = isRecord(mocked) ? mocked.apiClient : undefined;
  const get = isRecord(client) ? client.get : undefined;
  const post = isRecord(client) ? client.post : undefined;
  const patch = isRecord(client) ? client.patch : undefined;
  const remove = isRecord(client) ? client.delete : undefined;
  if (!isJestMock(get) || !isJestMock(post) || !isJestMock(patch) || !isJestMock(remove))
    throw new Error(
      'apiClientMock: "@/lib/api-client" is not mocked with jest.fn() get/post/patch/delete',
    );
  return { get, post, patch, delete: remove };
}

/**
 * Every mutation hook reads its QueryClient from `useNotificationInboxInvalidation`,
 * so the spec's client only reaches the hook by being pushed through that mock.
 */
export function withInjectedClient(client: QueryClient): void {
  const mocked = jest.requireMock("./notifications-shared");
  const hook = isRecord(mocked) ? mocked.useNotificationInboxInvalidation : undefined;
  if (!isJestMock(hook))
    throw new Error(
      'withInjectedClient: "./notifications-shared" is not mocked with a jest.fn() useNotificationInboxInvalidation',
    );
  hook.mockReturnValue({
    invalidateInbox: jest.fn(),
    orgId: "org-1",
    queryClient: client,
  });
}
