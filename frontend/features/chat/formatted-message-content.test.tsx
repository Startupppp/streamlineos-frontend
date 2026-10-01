const mockUseTicketSearch = jest.fn();
jest.mock("@/hooks/api/build/ticket-search", () => ({
  useTicketSearch: (q: string) => mockUseTicketSearch(q),
}));

import { render, screen } from "@testing-library/react";
import { renderFormattedContent } from "./formatted-message-content";

const hit = (projectKey: string, ticketNumber: number, projectId: number) => ({
  id: ticketNumber,
  title: "t",
  status: "TODO",
  priority: "MEDIUM",
  ticketNumber,
  projectId,
  projectKey,
  projectName: "P",
});

beforeEach(() => {
  mockUseTicketSearch.mockReset();
  mockUseTicketSearch.mockImplementation((q: string) => ({
    // The search is a substring match, so ACP-520 comes back for ACP-52 too.
    data: q === "ACP-52" ? [hit("ACP", 520, 7), hit("ACP", 52, 7)] : [],
  }));
});

describe("renderFormattedContent ticket keys", () => {
  it("links a typed key to its ticket page once the search returns that exact key", () => {
    render(<p>{renderFormattedContent("please look at ACP-52 today", false)}</p>);

    const link = screen.getByRole("link", { name: "ACP-52" });
    expect(link.getAttribute("href")).toBe("/build/7/tickets/ACP-52");
  });

  it("leaves a key-shaped word that is no ticket as text", () => {
    render(<p>{renderFormattedContent("encode it as UTF-8", false)}</p>);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("UTF-8")).toBeTruthy();
  });

  it("does not linkify a key inside a code span or a URL", () => {
    render(
      <p>{renderFormattedContent("`ACP-52` and https://jira.example.com/browse/ACP-52", false)}</p>,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(mockUseTicketSearch).not.toHaveBeenCalled();
  });
});

describe("renderFormattedContent — CHAT-S04 nested emphasis", () => {
  it("renders *** as bold italic instead of printing the markers", () => {
    const { container } = render(
      <div>{renderFormattedContent("***urgent***", false)}</div>,
    );

    const strong = container.querySelector("strong");
    expect(strong?.querySelector("em")?.textContent).toBe("urgent");
    expect(container.textContent).not.toContain("*");
  });

  it("renders italic nested inside bold", () => {
    const { container } = render(
      <div>{renderFormattedContent("**ship *today* please**", false)}</div>,
    );

    const strong = container.querySelector("strong");
    expect(strong?.textContent).toBe("ship today please");
    expect(strong?.querySelector("em")?.textContent).toBe("today");
    expect(container.textContent).not.toContain("*");
  });

  it("renders a code span nested inside bold italic, which is what the composer emits", () => {
    const { container } = render(
      <div>{renderFormattedContent("***`npm ci`***", false)}</div>,
    );

    const code = container.querySelector("strong em code");
    expect(code?.textContent).toBe("npm ci");
    expect(container.textContent).not.toContain("*");
  });

  it("leaves an unpaired marker as text", () => {
    const { container } = render(
      <div>{renderFormattedContent("2 ** 3 is not bold", false)}</div>,
    );

    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toBe("2 ** 3 is not bold");
  });
});
