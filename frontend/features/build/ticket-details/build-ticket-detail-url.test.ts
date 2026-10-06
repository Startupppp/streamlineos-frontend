import {
  buildMyWorkReturnHref,
  buildTicketCollectionReturnHref,
  buildTicketDetailUrl,
  buildEpicDetailUrl,
  buildPersonDetailUrl,
  buildClientDetailUrl,
  getMyWorkTicketHref,
  getIntakeTicketHref,
  buildIntakeReturnHref,
  isTicketDetailPath,
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

describe("canonical record URLs — non-ticket record types use their own canonical paths", () => {
  it("buildEpicDetailUrl returns the canonical epic path with projectId and epicId", () => {
    expect(buildEpicDetailUrl(12, 55)).toBe("/build/12/epics/55");
  });

  it("buildEpicDetailUrl appends returnTo when provided so the user can navigate back", () => {
    expect(buildEpicDetailUrl(12, 55, "/build/12/issues")).toBe(
      "/build/12/epics/55?returnTo=%2Fbuild%2F12%2Fissues",
    );
  });

  it("buildEpicDetailUrl omits returnTo when not provided, keeping the URL clean", () => {
    expect(buildEpicDetailUrl(12, 55, null)).toBe("/build/12/epics/55");
  });

  it("buildPersonDetailUrl returns the canonical HR employee path", () => {
    expect(buildPersonDetailUrl("emp-abc-123")).toBe("/hr/employees/emp-abc-123");
  });

  it("buildClientDetailUrl returns the canonical CRM client path", () => {
    expect(buildClientDetailUrl(99)).toBe("/crm/clients/99");
  });
});

describe("isTicketDetailPath", () => {
  it("matches the ticket route for the same project and key", () => {
    expect(isTicketDetailPath("/build/7/tickets/ABC-12", 7, "ABC-12")).toBe(true);
    expect(isTicketDetailPath("/build/7/tickets/ABC-12/", 7, "ABC-12")).toBe(true);
  });

  it("decodes encoded segments before comparing", () => {
    expect(isTicketDetailPath("/build/7/tickets/A%20B-1", 7, "A B-1")).toBe(true);
  });

  it("rejects other projects, keys, paths and a missing pathname", () => {
    expect(isTicketDetailPath("/build/8/tickets/ABC-12", 7, "ABC-12")).toBe(false);
    expect(isTicketDetailPath("/build/7/tickets/ABC-13", 7, "ABC-12")).toBe(false);
    expect(isTicketDetailPath("/build/7/issues", 7, "ABC-12")).toBe(false);
    expect(isTicketDetailPath(null, 7, "ABC-12")).toBe(false);
  });

  it("returns false instead of throwing on malformed percent-encoding", () => {
    expect(isTicketDetailPath("/build/7/tickets/%E0%A4%A", 7, "ABC-12")).toBe(false);
  });
});

describe("Intake return navigation", () => {
  it("accepts same-project Intake paths and preserves allowlisted tab/mode/item", () => {
    const returnHref = buildIntakeReturnHref(
      12,
      new URLSearchParams("tab=accepted&mode=list&item=44&unsafe=drop"),
    );
    expect(returnHref).toBe("/build/12/intake?tab=accepted&item=44&mode=list");
    expect(resolveTicketBackHref(12, returnHref)).toBe(returnHref);
    expect(getIntakeTicketHref(12, "WEB", 81, returnHref)).toBe(
      `/build/12/tickets/WEB-81?returnTo=${encodeURIComponent(returnHref)}`,
    );
  });

  it("rejects cross-project or foreign Intake returns (customer Close-to-Issues bug)", () => {
    expect(resolveTicketBackHref(12, "/build/12/intake")).toBe("/build/12/intake");
    expect(resolveTicketBackHref(12, "/build/99/intake")).toBe("/build/12/issues");
    expect(resolveTicketBackHref(12, "/build/12/intake?redirect=//evil.example")).toBe(
      "/build/12/issues",
    );
    // Without returnTo, Close historically fell back to Issues — keep that for deep links
    expect(resolveTicketBackHref(12, null)).toBe("/build/12/issues");
  });

  it("accepts triage collection as a sibling Intake surface", () => {
    expect(resolveTicketBackHref(12, "/build/12/triage?tab=pending")).toBe(
      "/build/12/triage?tab=pending",
    );
  });
});
