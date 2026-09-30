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
