import {
  normalizeBuildDeepLink,
  parseInboxTicketLink,
} from "./parse-inbox-ticket-link";

describe("parseInboxTicketLink", () => {
  it("parses a canonical /build ticket-key href", () => {
    expect(parseInboxTicketLink("/build/1/tickets/STRE-29")).toEqual({
      projectId: 1,
      ticketId: null,
      ticketKey: "STRE-29",
      commentId: null,
      href: "/build/1/tickets/STRE-29",
    });
  });

  it("normalizes legacy /projects ticket-key hrefs to /build", () => {
    expect(
      parseInboxTicketLink("/projects/1/tickets/STRE-29?comment=8"),
    ).toEqual({
      projectId: 1,
      ticketId: null,
      ticketKey: "STRE-29",
      commentId: 8,
      href: "/build/1/tickets/STRE-29?comment=8",
    });
  });

  it("parses a board deep-link with a numeric ticket id", () => {
    expect(parseInboxTicketLink("/build/4?ticket=900")).toEqual({
      projectId: 4,
      ticketId: 900,
      ticketKey: null,
      commentId: null,
      href: "/build/4?ticket=900",
    });
  });

  it("normalizes legacy /projects?ticket= board deep-links", () => {
    expect(parseInboxTicketLink("/projects/4?ticket=900&comment=2")).toEqual({
      projectId: 4,
      ticketId: 900,
      ticketKey: null,
      commentId: 2,
      href: "/build/4?ticket=900&comment=2",
    });
  });

  it("returns null for unrelated paths", () => {
    expect(parseInboxTicketLink("/dashboard")).toBeNull();
    expect(parseInboxTicketLink(null)).toBeNull();
  });
});

describe("normalizeBuildDeepLink", () => {
  it("rewrites /projects paths to /build for client-side navigation", () => {
    expect(normalizeBuildDeepLink("/projects/1")).toBe("/build/1");
    expect(normalizeBuildDeepLink("/projects/1/feedbucket/9")).toBe(
      "/build/1/feedbucket/9",
    );
  });

  it("leaves already-canonical /build paths alone", () => {
    expect(normalizeBuildDeepLink("/build/1/tickets/STRE-29")).toBe(
      "/build/1/tickets/STRE-29",
    );
  });
});
