const mockUseTicketRelatedLinks = jest.fn();
jest.mock("@/hooks/api/build/ticket-related-links", () => ({
  useTicketRelatedLinks: (...args: unknown[]) => mockUseTicketRelatedLinks(...args),
}));

import { render, screen } from "@testing-library/react";
import { TicketRelatedLinks, resolveLinkTarget } from "./ticket-related-links";

const row = (id: number, url: string, title: string | null) => ({
  id, orgId: "o", projectId: 9, ticketId: 1, url, title, description: null,
  createdBy: null, createdAt: "2026-09-30T00:00:00Z", updatedAt: "2026-09-30T00:00:00Z",
});

describe("TicketRelatedLinks", () => {
  it.each([
    `${window.location.origin}//evil.test/path`,
    "/\\evil.test/path",
  ])("renders unsafe local target %s as inert text", url => {
    mockUseTicketRelatedLinks.mockReturnValue({ data: [row(1, url, "Unsafe target")] });
    render(<TicketRelatedLinks projectId={9} ticketId={1} />);
    expect(screen.queryByRole("link", { name: "Unsafe target" })).toBeNull();
    expect(screen.getByText("Unsafe target")).toBeVisible();
    expect(resolveLinkTarget(url, window.location.origin)).toBeNull();
  });

  it("routes the source chat message in-app and opens outside links in a new tab", () => {
    mockUseTicketRelatedLinks.mockReturnValue({
      data: [
        row(1, `${window.location.origin}/chat?channel=7&message=42`, "Chat message"),
        row(2, "https://example.com/spec", null),
        row(3, "javascript:alert(1)", "Bad"),
      ],
    });

    render(<TicketRelatedLinks projectId={9} ticketId={1} />);

    const chat = screen.getByRole("link", { name: "Chat message" });
    expect(chat.getAttribute("href")).toBe("/chat?channel=7&message=42");
    expect(chat.getAttribute("target")).toBeNull();
    const external = screen.getByRole("link", { name: "https://example.com/spec" });
    expect(external.getAttribute("href")).toBe("https://example.com/spec");
    expect(external.getAttribute("target")).toBe("_blank");
    expect(external.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.queryByRole("link", { name: "Bad" })).toBeNull();
    expect(mockUseTicketRelatedLinks).toHaveBeenCalledWith(9, 1);
  });

  it("renders nothing when the ticket has no links", () => {
    mockUseTicketRelatedLinks.mockReturnValue({ data: [] });
    const { container } = render(<TicketRelatedLinks projectId={9} ticketId={1} />);
    expect(container.textContent).toBe("");
  });

  it("treats a stored relative path as internal and a protocol-relative one as foreign", () => {
    expect(resolveLinkTarget("/chat?channel=1", "https://app.test")).toEqual({ kind: "internal", href: "/chat?channel=1" });
    expect(resolveLinkTarget("//evil.test/x", "https://app.test")).toBeNull();
  });

  it("preserves local paths before a browser origin is available", () => {
    expect(resolveLinkTarget("/build/9?ticketId=1#detail", "")).toEqual({ kind: "internal", href: "/build/9?ticketId=1#detail" });
    expect(resolveLinkTarget("/safe/..//evil.test/path", "")).toBeNull();
  });

  it.each([
    { name: "project", url: "/build/9/tickets/WEB-123-29?commentId=42#discussion", href: "/build/9/tickets/WEB-123-29?commentId=42#discussion" },
    { name: "same-origin chat", url: `${window.location.origin}/chat?channel=7&message=42#reply`, href: "/chat?channel=7&message=42#reply" },
    { name: "normalized local path", url: "/chat/../build/9?ticketId=1#detail", href: "/build/9?ticketId=1#detail" },
  ])("preserves $name local navigation", ({ name, url, href }) => {
    mockUseTicketRelatedLinks.mockReturnValue({ data: [row(1, url, name)] });
    render(<TicketRelatedLinks projectId={9} ticketId={1} />);
    const link = screen.getByRole("link", { name });
    expect(link.getAttribute("href")).toBe(href);
    expect(new URL(href, window.location.origin).origin).toBe(window.location.origin);
    expect(link.getAttribute("target")).toBeNull();
    expect(resolveLinkTarget(url, window.location.origin)).toEqual({ kind: "internal", href });
  });

  it.each(["http://example.com/spec?mode=review#section", "https://example.com/spec?mode=review#section"])("preserves external HTTP target %s", url => {
    mockUseTicketRelatedLinks.mockReturnValue({ data: [row(1, url, "External specification")] });
    render(<TicketRelatedLinks projectId={9} ticketId={1} />);
    const link = screen.getByRole("link", { name: "External specification" });
    expect(link.getAttribute("href")).toBe(url);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(resolveLinkTarget(url, window.location.origin)).toEqual({ kind: "external", href: url });
  });

  it.each([
    { name: "protocol-relative", url: "//evil.test/path" },
    { name: "relative normalized double slash", url: "/safe/..//evil.test/path" },
    { name: "absolute normalized double slash", url: `${window.location.origin}/safe/..//evil.test/path` },
    { name: "relative control", url: "/chat\n?channel=7" },
    { name: "absolute control", url: `${window.location.origin}/chat\t?channel=7` },
    { name: "absolute backslash", url: "https://example.com\\evil.test/path" },
    { name: "malformed HTTP", url: "https://" },
    { name: "script", url: "javascript:alert(1)" },
    { name: "data", url: "data:text/html,example" },
    { name: "mail", url: "mailto:person@example.com" },
    { name: "FTP", url: "ftp://example.com/path" },
    { name: "empty", url: "" },
  ])("keeps $name target inert", ({ name, url }) => {
    mockUseTicketRelatedLinks.mockReturnValue({ data: [row(1, url, name)] });
    render(<TicketRelatedLinks projectId={9} ticketId={1} />);
    expect(screen.getByText(name)).toBeVisible();
    expect(screen.queryByRole("link", { name })).toBeNull();
    expect(resolveLinkTarget(url, window.location.origin)).toBeNull();
  });
});
