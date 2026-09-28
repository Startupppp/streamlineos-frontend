import { epicPageContract } from "@/hooks/api/build/execution-schema";

const row = {
  id: 1, orgId: "o", title: "Epic", description: null, type: "EPIC", status: "TODO",
  priority: "MEDIUM", health: null, projectId: 3, ticketNumber: 1, epicId: null,
  reporterId: null, points: null, storyPoints: null, link: null, rank: "1000",
  parentTicketId: null, originalEstimate: null, timeSpent: null, startDate: null,
  dueDate: null, moduleId: null, cycleId: null, sequenceId: null, estimate: null,
  version: 2, dependencyCount: 4, createdAt: "2026-09-01", updatedAt: "2026-09-01",
};

describe("epicPageContract — the page envelope and the flattened owner", () => {
  it("flattens the nested assignee the backend sends into the Ticket-shaped owner the card renders", () => {
    const parsed = epicPageContract.parse({
      data: [{ ...row, assignee: { id: 9, orgId: "o", user: { id: "u-1", name: "Ada", firstName: "Ada", lastName: "L", email: "a@b.c", image: null } } }],
      pagination: { limit: 25, hasMore: true, nextCursor: "abc" },
    });
    expect(parsed.data[0].assignee).toEqual({ id: "u-1", name: "Ada", firstName: "Ada", lastName: "L", email: "a@b.c", image: null });
    expect(parsed.pagination).toEqual({ limit: 25, hasMore: true, nextCursor: "abc" });
  });

  it("reads an unassigned epic as a null owner rather than rejecting the page", () => {
    const parsed = epicPageContract.parse({
      data: [{ ...row, assignee: null }],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });
    expect(parsed.data[0].assignee).toBeNull();
  });

  it("keeps the dependency count the endpoint projected, because the card renders it", () => {
    const parsed = epicPageContract.parse({
      data: [row],
      pagination: { limit: 25, hasMore: false, nextCursor: null },
    });
    expect(parsed.data[0].dependencyCount).toBe(4);
    expect(parsed.data[0].assignee).toBeNull();
  });

  it("rejects a bare array, so a route that regressed to the old shape fails loudly instead of rendering empty", () => {
    expect(() => epicPageContract.parse([row])).toThrow();
  });
});
