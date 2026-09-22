import { render } from "@testing-library/react";
import type { RefObject } from "react";
import { InboxList } from "./inbox-list";
import type {
  Notification,
  NotificationCategory,
  NotificationSection,
} from "@/types/notifications";

export function makeNotifications(count: number): Notification[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    orgId: "org-1",
    userId: "user-1",
    type: "INFO" as const,
    priority: "NORMAL" as const,
    category: "PROJECTS" as const,
    sourceModule: "build",
    eventKey: "build.ticket.mention",
    title: `notification-${i + 1}`,
    message: null,
    link: null,
    isRead: false,
    pinned: false,
    channel: "IN_APP",
    archivedAt: null,
    snoozedUntil: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
}

export function buildPages(
  counts: number[],
  hasNextPage: boolean,
  fetchNextPage: jest.Mock,
) {
  let issued = 0;
  const pages = counts.map((count) => {
    const page = makeNotifications(count).map((n) => ({
      ...n,
      id: n.id + issued,
      title: `notification-${n.id + issued}`,
    }));
    issued += count;
    return page;
  });
  return {
    data: { pages, pageParams: [] },
    isPending: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage,
    isFetchingNextPage: false,
    fetchNextPage,
  };
}

export const noop = () => undefined;

export const searchRef: RefObject<HTMLInputElement | null> = { current: null };

interface RenderInboxOptions {
  section?: NotificationSection;
  type?: NotificationCategory | null;
}

export function renderInbox(options: RenderInboxOptions = {}) {
  return render(
    <InboxList
      selectedId={null}
      onSelect={noop}
      section={options.section ?? "UNREAD"}
      q={null}
      type={options.type}
      searchInputRef={searchRef}
    />,
  );
}
