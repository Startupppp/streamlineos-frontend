import {
  buildTicketCollectionReturnHref,
  buildTicketDetailUrl,
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
});
