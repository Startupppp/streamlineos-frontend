import {
  buildTicketWatchersContract,
  buildWatcherMutationContract,
} from "./watchers-schema";

describe("build watcher contracts", () => {
  it("parses the watcher list wire shape", () => {
    expect(
      buildTicketWatchersContract.parse([
        {
          id: 1,
          ticketId: 25,
          createdAt: "2026-09-15T00:00:00.000Z",
          userId: "user-1",
          user: {
            id: "user-1",
            name: null,
            firstName: "Test",
            lastName: "Owner",
            image: null,
            email: "owner@example.test",
          },
        },
      ]),
    ).toHaveLength(1);
  });

  it("parses the add-watcher response independently from list rows", () => {
    expect(
      buildWatcherMutationContract.parse({
        userId: "user-1",
        name: null,
        image: null,
        membershipId: 42,
      }),
    ).toMatchObject({ userId: "user-1", membershipId: 42 });
  });
});
