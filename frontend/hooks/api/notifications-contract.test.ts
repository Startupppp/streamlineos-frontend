import { ZodError } from "zod";

import { notificationListContract } from "./notifications-schema";

const backendRow = {
  id: 7,
  orgId: "org-a",
  userId: "user-a",
  type: "INFO",
  priority: "NORMAL",
  category: "PROJECTS",
  sourceModule: "build",
  eventKey: "build.ticket.assigned",
  entityType: "ticket",
  entityId: "41",
  reason: null,
  title: "Ticket assigned",
  message: "BLD-41 was assigned to you",
  link: "/build/1/tickets/41",
  isRead: false,
  pinned: false,
  channel: "IN_APP",
  metadata: null,
  archivedAt: null,
  snoozedUntil: null,
  createdAt: "2026-09-20T10:00:00.000Z",
  ticketContext: {
    ticketId: 41,
    ticketKey: "BLD-41",
    priority: "HIGH",
    status: "IN_PROGRESS",
    type: "BUG",
    assignee: {
      id: "user-b",
      name: "Priya R",
      firstName: "Priya",
      lastName: "R",
      image: null,
    },
  },
};

const page = { data: [backendRow], hasMore: false, nextCursor: null };

describe("the notification list contract against notification-response-schema.ts", () => {
  it("keeps ticketContext, because z.object drops a field the contract omits and the inbox row then renders no priority, status, type or assignee", () => {
    const parsed = notificationListContract.parse(page);
    expect(parsed.data[0]?.ticketContext).toEqual(backendRow.ticketContext);
  });

  it("keeps a null ticketContext, the value the backend sends for a notification that names no ticket", () => {
    const parsed = notificationListContract.parse({
      ...page,
      data: [{ ...backendRow, ticketContext: null }],
    });
    expect(parsed.data[0]?.ticketContext).toBeNull();
  });

  it("keeps a null assignee, status and type, which the backend declares nullable and an unassigned ticket actually returns", () => {
    const parsed = notificationListContract.parse({
      ...page,
      data: [
        {
          ...backendRow,
          ticketContext: {
            ...backendRow.ticketContext,
            status: null,
            type: null,
            assignee: null,
          },
        },
      ],
    });
    expect(parsed.data[0]?.ticketContext?.assignee).toBeNull();
    expect(parsed.data[0]?.ticketContext?.status).toBeNull();
  });

  it("rejects a row whose ticketContext key the backend stopped sending, so the omission fails here rather than as a blank inbox row", () => {
    const { ticketContext: _omitted, ...withoutContext } = backendRow;
    expect(() =>
      notificationListContract.parse({ ...page, data: [withoutContext] }),
    ).toThrow(ZodError);
  });
});
