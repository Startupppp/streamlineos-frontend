import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Notification } from "@/types/notifications";
import { InboxNotificationItem } from "./inbox-notification-item";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 26,
    orgId: "org-1",
    userId: "user-1",
    type: "INFO",
    priority: "NORMAL",
    category: "PROJECTS",
    sourceModule: "BUILD",
    title: "Task status changed",
    message: "Task status changed",
    link: null,
    isRead: false,
    pinned: false,
    channel: "IN_APP",
    archivedAt: null,
    snoozedUntil: null,
    createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

const noop = () => undefined;

describe("InboxNotificationItem", () => {
  it("does not repeat a title that is already the message", () => {
    render(
      <InboxNotificationItem
        notification={makeNotification()}
        isSelected={false}
        onSelect={noop}
      />,
    );

    expect(screen.getAllByText("Task status changed")).toHaveLength(1);
  });

  it("does not dump the raw source module onto the row", () => {
    render(
      <InboxNotificationItem
        notification={makeNotification()}
        isSelected={false}
        onSelect={noop}
      />,
    );

    expect(screen.queryByText("BUILD")).not.toBeInTheDocument();
  });

  it("keeps a body that adds information", () => {
    render(
      <InboxNotificationItem
        notification={makeNotification({
          message: 'Payment page moved to "In review".',
        })}
        isSelected={false}
        onSelect={noop}
      />,
    );

    expect(screen.getByText('Payment page moved to "In review".')).toBeInTheDocument();
  });

  it("shows ticket identity instead of a module tag", () => {
    render(
      <InboxNotificationItem
        notification={makeNotification({
          ticketContext: {
            ticketId: 41,
            ticketKey: "BLD-41",
            priority: "HIGH",
            status: "IN_PROGRESS",
            type: "TASK",
            assignee: {
              id: "user-2",
              name: "Ada Lovelace",
              firstName: "Ada",
              lastName: "Lovelace",
              image: null,
            },
          },
        })}
        isSelected={false}
        onSelect={noop}
      />,
    );

    expect(screen.getByText("BLD-41")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("BUILD")).not.toBeInTheDocument();
  });

  it("marks unread without a left stripe", () => {
    render(
      <InboxNotificationItem
        notification={makeNotification()}
        isSelected={false}
        onSelect={noop}
      />,
    );

    expect(screen.getByRole("button").className).not.toMatch(/border-l-/);
  });

  it("selects the notification from the row", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const notification = makeNotification();

    render(
      <InboxNotificationItem
        notification={notification}
        isSelected={false}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(notification);
  });
});
