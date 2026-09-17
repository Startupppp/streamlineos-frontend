import { commentDraftContract, commentDraftListContract } from "./comment-drafts-schema";

it("accepts the PUT /build/comment-drafts/tickets/:ticketId response, which the service returns as a bare commentDrafts row with no ticket join", () => {
  const raw = {
    id: 5,
    ticketId: 42,
    body: "Draft body",
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  };

  const result = commentDraftContract.parse(raw);

  expect(result.ticket).toBeUndefined();
  expect(result.ticketId).toBe(42);
});

it("still accepts the GET /build/comment-drafts/mine shape, which joins tickets and always sends a nested ticket", () => {
  const ticket = {
    id: 42,
    type: "TASK",
    title: "Fix the thing",
    projectId: 7,
    status: "TODO",
    ticketNumber: 12,
    projectKey: "ENG",
    priority: "HIGH",
    projectName: "Engineering",
    assignee: {
      id: "user-1",
      name: "Alex",
      image: null,
      firstName: "Alex",
      lastName: null,
    },
  };
  const raw = [
    {
      id: 5,
      ticketId: 42,
      body: "Draft body",
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
      ticket,
    },
  ];

  const result = commentDraftListContract.parse(raw);

  expect(result[0]?.ticket).toEqual(ticket);
});

it("rejects a draft whose ticketId is not a number, since the drafts page keys the list on it", () => {
  const raw = {
    id: 5,
    ticketId: "42",
    body: "Draft body",
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  };

  expect(commentDraftContract.safeParse(raw).success).toBe(false);
});
