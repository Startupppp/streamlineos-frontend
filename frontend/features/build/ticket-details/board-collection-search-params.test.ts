import { boardCollectionSearchParams, myWorkCollectionSearchParams } from "./build-ticket-detail-url";

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

describe("myWorkCollectionSearchParams", () => {
  it("keeps the My Work query when the address bar is the ticket pane", () => {
    const live = new URLSearchParams();
    live.set("returnTo", "/build/my-work?q=QA-070&view=list");
    const params = myWorkCollectionSearchParams("/build/1/tickets/STRE-35", live);
    expect(params.get("q")).toBe("QA-070");
    expect(params.get("view")).toBe("list");
  });

  it("copies the live My Work query when the pane is closed", () => {
    const params = myWorkCollectionSearchParams("/build/my-work", new URLSearchParams("q=QA-070&relation=created"));
    expect(params.get("q")).toBe("QA-070");
    expect(params.get("relation")).toBe("created");
  });

  it("drops a return target that is not My Work", () => {
    const live = new URLSearchParams();
    live.set("returnTo", "/build/1/issues?q=QA-070");
    const params = myWorkCollectionSearchParams("/build/1/tickets/STRE-35", live);
    expect(params.get("q")).toBeNull();
  });
});
