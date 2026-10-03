import {
  formatTicketKey,
  getTicketDetailHref,
  parseTicketKey,
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
});
