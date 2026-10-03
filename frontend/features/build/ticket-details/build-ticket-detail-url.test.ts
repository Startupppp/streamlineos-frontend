import {
  buildMyWorkReturnHref,
  buildTicketCollectionReturnHref,
  buildTicketDetailUrl,
  getMyWorkTicketHref,
  resolveTicketBackHref,
} from "./build-ticket-detail-url";

describe("ticket detail return navigation", () => {
  it("records only issue collection state on the ticket URL", () => {
    const source = new URLSearchParams(
      "viewId=9&view=list&q=login&status=TODO&cycle=7&module=4&ticket=22&comment=8&unsafe=value",
    );
    const returnHref = buildTicketCollectionReturnHref(
      12,
      "/build/12/issues",
      source,
    );

    expect(returnHref).toBe(
      "/build/12/issues?viewId=9&view=list&q=login&status=TODO&cycle=7&module=4",
    );
    expect(
      buildTicketDetailUrl(
        12,
        "WEB",
        22,
        [{ id: 22, ticketNumber: 81 }],
        8,
        returnHref,
      ),
    ).toBe(
      "/build/12/tickets/WEB-81?comment=8&returnTo=%2Fbuild%2F12%2Fissues%3FviewId%3D9%26view%3Dlist%26q%3Dlogin%26status%3DTODO%26cycle%3D7%26module%3D4",
    );
  });

  it("accepts a same-project issue collection and rejects unsafe returns", () => {
    expect(
      resolveTicketBackHref(
        12,
        "/build/12/issues?view=table&groupBy=assignee&orderBy=priority",
      ),
    ).toBe(
      "/build/12/issues?view=table&groupBy=assignee&orderBy=priority",
    );
    expect(resolveTicketBackHref(12, "/build/13/issues?status=TODO")).toBe(
      "/build/12/issues",
    );
    expect(resolveTicketBackHref(12, "https://example.com/build/12/issues")).toBe(
      "/build/12/issues",
    );
    expect(resolveTicketBackHref(12, "/build/12/issues?redirect=https://example.com")).toBe(
      "/build/12/issues",
    );
    expect(resolveTicketBackHref(12, "/build/12/issues?%00")).toBe(
      "/build/12/issues",
    );
  });

  it("falls back to Issues for a direct ticket deep link", () => {
    expect(resolveTicketBackHref(12, null)).toBe("/build/12/issues");
  });

  it("preserves allowlisted My Work state in canonical ticket links", () => {
    const source = new URLSearchParams(
      "section=drafts&relation=created&q=review&projectId=12&sort=updated&dir=desc&cursor=c5&returnTo=//outside.example",
    );
    const returnHref = buildMyWorkReturnHref(source);

    expect(returnHref).toBe(
      "/build/my-work?q=review&cursor=c5&section=drafts&relation=created&sort=updated&dir=desc&projectId=12",
    );
    expect(getMyWorkTicketHref(12, "WEB", 81, returnHref)).toBe(
      `/build/12/tickets/WEB-81?returnTo=${encodeURIComponent(returnHref)}`,
    );
    expect(getMyWorkTicketHref(12, null, 81, returnHref)).toBe(
      `/build/12/tickets/81?returnTo=${encodeURIComponent(returnHref)}`,
    );
    expect(resolveTicketBackHref(12, returnHref)).toBe(returnHref);
  });

  it("rejects unsafe My Work returns and bounds long filter state", () => {
    expect(resolveTicketBackHref(12, "/build/my-work?redirect=//outside.example")).toBe(
      "/build/12/issues",
    );
    expect(resolveTicketBackHref(12, "//outside.example/build/my-work")).toBe(
      "/build/12/issues",
    );
    expect(buildMyWorkReturnHref(new URLSearchParams({ q: "x".repeat(2100) }))).toBe(
      "/build/my-work",
    );
    expect(getMyWorkTicketHref(12, "WEB", 81, "//outside.example")).toBe(
      "/build/12/tickets/WEB-81?returnTo=%2Fbuild%2F12%2Fissues",
    );
  });
});
