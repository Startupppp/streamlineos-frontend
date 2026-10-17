import { fireEvent, render, screen } from "@testing-library/react";
import { BulkActionsBar } from "./inbox-bulk-actions";
import type { InboxActions } from "./use-inbox-actions";
import type { UnifiedInboxItem } from "@/types/inbox";

const notification: UnifiedInboxItem = {
  kind: "notification",
  id: 41,
  notifType: "INFO",
  priority: "NORMAL",
  category: "SYSTEM",
  eventKey: null,
  body: "A notification",
  pinned: false,
  sourceModule: "system",
  actor: null,
  subject: "Notification",
  timestamp: "2026-09-23T00:00:00.000Z",
  isRead: false,
  deepLink: null,
  dedupKey: "notification:41",
};

const mail: UnifiedInboxItem = {
  kind: "mail",
  id: "message-1",
  threadId: null,
  accountId: 1,
  snippet: "A message",
  hasAttachments: false,
  sourceModule: "mail",
  actor: null,
  subject: "Mail",
  timestamp: "2026-09-23T00:00:00.000Z",
  isRead: false,
  deepLink: null,
  dedupKey: "mail:1:message-1",
};

function actions(overrides: Partial<InboxActions> = {}): InboxActions {
  return {
    isOnline: true,
    markReadOnOpen: jest.fn(),
    dismissBroadcastOnOpen: jest.fn(),
    handleMarkRead: jest.fn(),
    handleArchive: jest.fn(),
    handleUnarchive: jest.fn(),
    handlePin: jest.fn(),
    handleSnooze: jest.fn(),
    handleDelete: jest.fn(),
    handleApprove: jest.fn(),
    handleReject: jest.fn(),
    approvingId: undefined,
    rejectingId: undefined,
    archivingId: undefined,
    deletingId: undefined,
    ...overrides,
  };
}

describe("BulkActionsBar", () => {
  it("labels notification-only actions honestly when the selection includes another source", () => {
    const onClearSelection = jest.fn();
    const inboxActions = actions();
    render(
      <BulkActionsBar
        selectedKeys={new Set([notification.dedupKey, mail.dedupKey])}
        items={[notification, mail]}
        actions={inboxActions}
        onClearSelection={onClearSelection}
      />,
    );

    const markRead = screen.getByRole("button", {
      name: "Mark read (1 notifications)",
    });
    fireEvent.click(markRead);

    expect(inboxActions.handleMarkRead).toHaveBeenCalledWith(41);
    expect(inboxActions.handleMarkRead).toHaveBeenCalledTimes(1);
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("does not present notification actions when only a mail item is selected", () => {
    render(
      <BulkActionsBar
        selectedKeys={new Set([mail.dedupKey])}
        items={[mail]}
        actions={actions()}
        onClearSelection={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /mark read/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /archive/i })).toBeNull();
  });
});
