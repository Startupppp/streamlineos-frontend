import {
  extractBuildProjectId,
  normalizeBuildDeepLink,
  parseInboxTicketLink,
} from "./parse-inbox-ticket-link";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";

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

  it("sends a legacy project-root deep-link to the board, the only surface that reads ?ticket=", () => {
    expect(parseInboxTicketLink("/build/4?ticket=900")).toEqual({
      projectId: 4,
      ticketId: 900,
      ticketKey: null,
      commentId: null,
      href: "/build/4/issues?ticket=900",
    });
  });

  it("parses a board deep-link already written against the canonical /issues path", () => {
    expect(parseInboxTicketLink("/build/4/issues?ticket=900")).toEqual({
      projectId: 4,
      ticketId: 900,
      ticketKey: null,
      commentId: null,
      href: "/build/4/issues?ticket=900",
    });
  });

  it("normalizes legacy /projects?ticket= board deep-links", () => {
    expect(parseInboxTicketLink("/projects/4?ticket=900&comment=2")).toEqual({
      projectId: 4,
      ticketId: 900,
      ticketKey: null,
      commentId: 2,
      href: "/build/4/issues?ticket=900&comment=2",
    });
  });

  it("returns null for unrelated paths", () => {
    expect(parseInboxTicketLink("/dashboard")).toBeNull();
    expect(parseInboxTicketLink(null)).toBeNull();
  });

  it.each([
    "/build/1/tickets/%",
    "/build/1/tickets/%E0%A4%A",
    "/build/1/tickets/%C0%AF",
    "/build/1/tickets/STRE%2F29",
    "/build/1/tickets/not-a-ticket",
    "/build/0/tickets/STRE-29",
    "/build/2147483648/tickets/STRE-29",
    "/build/1/tickets/0",
    "/build/1/tickets/2147483648",
    "/build/1/tickets/STRE-0",
    "/build/1/tickets/STRE-2147483648",
    "/build/1?ticket=7junk",
    "/build/1?ticket=7e2",
    "/build/1?ticket=0",
    "/build/1?ticket=-7",
    "/build/1?ticket=2147483648",
    "/build/0?ticket=7",
    "/build/2147483648?ticket=7",
    "/build/1/tickets/STRE-29?comment=7junk",
    "/build/1/tickets/STRE-29?comment=0",
    "/build/1/tickets/STRE-29?comment=-7",
    "/build/1/tickets/STRE-29?comment=2147483648",
    "/build/1?ticket=7&comment=7junk",
    "/build/1?ticket=7&comment=",
  ])("refuses malformed or invalid identifiers without throwing: %s", (link) => {
    expect(parseInboxTicketLink(link)).toBeNull();
  });

  it.each([
    "/build/2147483647/tickets/STRE-2147483647?comment=2147483647",
    "/projects/2147483647/tickets/2147483647?comment=2147483647",
  ])("retains valid maximum int32 ticket and comment identifiers: %s", (link) => {
    expect(parseInboxTicketLink(link)).toEqual({
      projectId: 2147483647,
      ticketId: link.includes("STRE-") ? null : 2147483647,
      ticketKey: link.includes("STRE-") ? "STRE-2147483647" : null,
      commentId: 2147483647,
      href: link.replace("/projects/", "/build/"),
    });
  });

  it("retains a valid numeric ticket, encoded key and board query", () => {
    expect(parseInboxTicketLink("/build/1/tickets/29")?.ticketId).toBe(29);
    expect(parseInboxTicketLink("/build/1/tickets/STRE%2D29")?.ticketKey).toBe("STRE-29");
    expect(parseInboxTicketLink("/build/2147483647/issues?ticket=2147483647&comment=2147483647")?.href)
      .toBe("/build/2147483647/issues?ticket=2147483647&comment=2147483647");
  });

  it.each([false, true])("round-trips a produced generated-project key and comment in a legacy=%s link", (legacy) => {
    const href = getTicketDetailHref(12, "WEB-123", 29, 9);
    const link = legacy ? href.replace("/build/", "/projects/") : href;
    expect(parseInboxTicketLink(link)).toEqual({
      projectId: 12, ticketId: null, ticketKey: "WEB-123-29", commentId: 9, href,
    });
  });
});

describe("extractBuildProjectId", () => {
  it.each([
    "/build/0/tickets/STRE-29",
    "/build/2147483648/tickets/STRE-29",
    "/build/1junk/tickets/STRE-29",
    "/build/01/tickets/STRE-29",
    "/dashboard",
  ])("refuses an invalid or non-project path: %s", (link) => {
    expect(extractBuildProjectId(link)).toBeNull();
  });

  it("retains canonical and legacy project context", () => {
    expect(extractBuildProjectId("/build/1/tickets/STRE-29")).toBe(1);
    expect(extractBuildProjectId("/projects/2147483647/feedbucket/9")).toBe(2147483647);
    expect(extractBuildProjectId("/build/29")).toBe(29);
  });
});

describe("normalizeBuildDeepLink", () => {
  it("rewrites /projects paths to /build for client-side navigation", () => {
    expect(normalizeBuildDeepLink("/projects?view=active")).toBe(
      "/build/projects?view=active",
    );
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
