import { sprintListContract } from "./execution-schema";

it("preserves sprint tickets used by progress summaries", () => {
  const tickets = [
    {
      id: 7,
      title: "Scoped ticket",
      status: "IN_REVIEW",
      points: 8,
      sprintId: 2,
    },
  ];

  const result = sprintListContract.parse([
    {
      id: 2,
      orgId: "org-1",
      projectId: 5,
      name: "Sprint 1",
      startDate: "2026-09-15T00:00:00.000Z",
      endDate: "2026-09-29T00:00:00.000Z",
      goal: null,
      status: "PLANNED",
      tickets,
    },
  ]);

  expect(result[0]?.tickets).toEqual(tickets);
});
