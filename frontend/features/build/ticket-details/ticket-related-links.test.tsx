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
    expect(external.getAttribute("target")).toBe("_blank");
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
});
