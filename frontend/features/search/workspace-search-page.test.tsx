import { act, fireEvent, render, screen } from "@testing-library/react";
import { WorkspaceSearchPage } from "./workspace-search-page";

const replace = jest.fn();
const searchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

jest.mock("./workspace-search-history", () => ({
  useWorkspaceSearchHistory: () => ({
    history: [],
    remember: jest.fn(),
    clear: jest.fn(),
  }),
}));

jest.mock("./workspace-search-results", () => ({
  WorkspaceSearchResults: ({ query }: { query: string }) => (
    <div data-testid="published-query">{query}</div>
  ),
}));

describe("WorkspaceSearchPage URL publishing", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    replace.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces search for 300ms and keeps it under the Build route", () => {
    render(<WorkspaceSearchPage />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Build" }), {
      target: { value: "STRE" },
    });

    act(() => jest.advanceTimersByTime(299));
    expect(replace).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledWith("/build/search?q=STRE", {
      scroll: false,
    });
    expect(screen.getByTestId("published-query")).toHaveTextContent("STRE");
  });

  it("publishes immediately when Enter submits the shared search input", () => {
    render(<WorkspaceSearchPage />);
    const input = screen.getByRole("searchbox", { name: "Search Build" });
    fireEvent.change(input, { target: { value: "portal" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(replace).toHaveBeenCalledWith("/build/search?q=portal", {
      scroll: false,
    });
  });
});
