import {
  formatTicketKey,
  getTicketDetailHref,
  parseTicketKey,
  ticketKeyMatchesProject,
} from "./format-ticket-key";

describe("ticket key links", () => {
  it("keeps the project key in a canonical ticket detail URL", () => {
    const href = getTicketDetailHref(12, "WEB", 81);

    expect(href).toBe("/build/12/tickets/WEB-81");
    expect(parseTicketKey(decodeURIComponent(href.split("/").at(-1) ?? ""))).toEqual({
      projectKey: "WEB",
      ticketNumber: 81,
    });
  });

  it.each([null, ""])(
    "uses a parseable numeric URL when the project key is %p",
    (projectKey) => {
      const href = getTicketDetailHref(12, projectKey, 81);

      expect(formatTicketKey(projectKey, 81)).toBe("#81");
      expect(href).toBe("/build/12/tickets/81");
      expect(parseTicketKey(decodeURIComponent(href.split("/").at(-1) ?? ""))).toEqual({
        ticketNumber: 81,
      });
    },
  );

  it("retains a comment deep link with a missing project key", () => {
    expect(getTicketDetailHref(12, null, 81, 9)).toBe(
      "/build/12/tickets/81?comment=9",
    );
  });

  it.each(["WEB-123", "PRJ-000", "API2-999"])(
    "round-trips provisioned project key %s through the canonical ticket URL producer",
    (projectKey) => {
      const href = getTicketDetailHref(12, projectKey, 29, 9);
      const url = new URL(href, "http://local.invalid");
      const segment = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
      expect(href).toBe(`/build/12/tickets/${projectKey}-29?comment=9`);
      expect(formatTicketKey(projectKey, 29)).toBe(`${projectKey}-29`);
      expect(parseTicketKey(segment)).toEqual({ projectKey, ticketNumber: 29 });
      expect(url.searchParams.get("comment")).toBe("9");
    },
  );

  it.each([
    "0", "-1", "2147483648", "9007199254740993", "29junk", "29e2",
    "WEB-0", "WEB-2147483648", "WEB-123-0", "WEB-123-2147483648", "WEB--29", "WEB/29",
  ])("refuses an invalid or out-of-range ticket key %s", (key) => {
    expect(parseTicketKey(key)).toBeNull();
  });

  it.each(["WEB-2147483647", "WEB-123-2147483647"])(
    "preserves a bounded ticket suffix in %s",
    (key) => {
      expect(parseTicketKey(key)).toEqual({
        projectKey: key.slice(0, key.lastIndexOf("-")), ticketNumber: 2147483647,
      });
    },
  );
});

describe("ticketKeyMatchesProject", () => {
  it("404s a wrong project-key prefix while preserving the ticket number", () => {
    const parsed = parseTicketKey("NOPE-1");
    expect(parsed).toEqual({ projectKey: "NOPE", ticketNumber: 1 });
    expect(ticketKeyMatchesProject(parsed, "SETUP-6FC6A9")).toBe(false);
    expect(ticketKeyMatchesProject(parsed, "NOPE")).toBe(true);
  });

  it("allows numeric-only keys and rejects a prefixed key when the project has none", () => {
    expect(ticketKeyMatchesProject(parseTicketKey("1"), "SETUP-6FC6A9")).toBe(true);
    expect(ticketKeyMatchesProject(parseTicketKey("NOPE-1"), null)).toBe(false);
    expect(ticketKeyMatchesProject(null, "SETUP")).toBe(false);
  });

  it("matches project keys case-insensitively", () => {
    expect(ticketKeyMatchesProject(parseTicketKey("setup-6fc6a9-1"), "SETUP-6FC6A9")).toBe(true);
  });
});
