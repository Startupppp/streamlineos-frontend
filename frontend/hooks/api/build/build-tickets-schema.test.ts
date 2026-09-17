import { ticketRelationListContract } from "./build-tickets-schema";

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

it("still accepts a relation whose related ticket has been deleted (null relatedTicket)", () => {
  const result = ticketRelationListContract.parse([
    {
      id: 2,
      relationType: "relates_to",
      relatedTicket: null,
      direction: "incoming",
    },
  ]);

  expect(result[0]?.relatedTicket).toBeNull();
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
  ).toThrow();
});
