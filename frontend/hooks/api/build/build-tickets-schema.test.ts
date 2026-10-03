import { ZodError } from "zod";

import { ticketRelationListContract } from "./build-tickets-subresource-schema";

it("accepts the joined relation shape listRelations actually returns, not the raw work_item_relations row", () => {
  const result = ticketRelationListContract.parse([
    {
      id: 1,
      relationType: "blocks",
      relatedTicket: {
        id: 42,
        title: "Related ticket",
        ticketNumber: 12,
        status: "IN_PROGRESS",
        priority: "HIGH",
        type: "BUG",
        points: 3,
        version: 3,
        assigneeMembershipId: 7,
        projectId: 5,
        assignee: null,
        project: { key: "ENG" },
      },
      direction: "outgoing",
    },
  ]);

  expect(result[0]?.relatedTicket?.title).toBe("Related ticket");
  expect(result[0]?.direction).toBe("outgoing");
});

it("rejects a related ticket with no version, because a stale relatedTicket cache entry cannot resolve a concurrent edit conflict", () => {
  expect(() =>
    ticketRelationListContract.parse([
      {
        id: 1,
        relationType: "blocks",
        relatedTicket: {
          id: 42,
          title: "Related ticket",
          ticketNumber: 12,
          status: "IN_PROGRESS",
          priority: "HIGH",
          type: "BUG",
          points: 3,
          assigneeMembershipId: 7,
          projectId: 5,
          assignee: null,
          project: { key: "ENG" },
        },
        direction: "outgoing",
      },
    ]),
  ).toThrow(ZodError);
});

it("rejects a relation whose relatedTicket is null, because the backend always joins before returning the row", () => {
  expect(() =>
    ticketRelationListContract.parse([
      {
        id: 2,
        relationType: "relates_to",
        relatedTicket: null,
        direction: "incoming",
      },
    ]),
  ).toThrow(ZodError);
});

it("rejects an unknown relation type such as the raw row's absent relationType default", () => {
  expect(() =>
    ticketRelationListContract.parse([
      {
        id: 3,
        relationType: "linked",
        relatedTicket: null,
        direction: "outgoing",
      },
    ]),
  ).toThrow(ZodError);
});
