import { boardCollectionSearchParams } from "./build-ticket-detail-url";

describe("boardCollectionSearchParams", () => {
  it("reads view=list from returnTo when the ticket panel URL is open (C12)", () => {
    const params = boardCollectionSearchParams(
      29,
      "/build/29/tickets/STRE-1",
      new URLSearchParams({
        returnTo: "/build/29/issues?view=list&q=login",
      }),
    );
    expect(params.get("view")).toBe("list");
    expect(params.get("q")).toBe("login");
  });

  it("passes through issue collection params on the issues path", () => {
    const params = boardCollectionSearchParams(
      29,
      "/build/29/issues",
      new URLSearchParams({ view: "board", status: "TODO" }),
    );
    expect(params.get("view")).toBe("board");
    expect(params.get("status")).toBe("TODO");
  });
});
