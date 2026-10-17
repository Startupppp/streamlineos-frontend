import { render, screen } from "@testing-library/react";
import { FilesSection, RequestsSection, UpdatesSection } from "./portal-paged-sections";

const mockFiles = jest.fn();
const mockUpdates = jest.fn();
const mockRequests = jest.fn();

jest.mock("@/hooks/api/portal/use-portal-project-children", () => ({
  usePortalProjectFiles: (...args: [number]) => mockFiles(...args),
  usePortalProjectUpdates: (...args: [number]) => mockUpdates(...args),
  usePortalProjectRequests: (...args: [number]) => mockRequests(...args),
}));

const fetchNextPage = jest.fn();

function page(items: unknown[], hasMore: boolean) {
  return {
    items,
    isLoading: false,
    isFetchingNextPage: false,
    hasMore,
    fetchNextPage,
  };
}

const UPDATE_ROWS = [
  { id: 31, body: "Second update", authorName: "Alice", createdAt: "2026-05-02T09:00:00.000Z" },
  { id: 22, body: "First update", authorName: "Bob", createdAt: "2026-05-01T09:00:00.000Z" },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockFiles.mockReturnValue(page([], false));
  mockUpdates.mockReturnValue(page([], false));
  mockRequests.mockReturnValue(page([], false));
});

describe("portal paged sections read their own cursor-paged endpoint", () => {
  it("renders the rows the updates page returned, newest first", () => {
    mockUpdates.mockReturnValue(page(UPDATE_ROWS, false));
    render(<UpdatesSection projectId={10} />);
    expect(mockUpdates).toHaveBeenCalledWith(10);
    expect(screen.getByText("Second update")).toBeInTheDocument();
    expect(screen.getByText("First update")).toBeInTheDocument();
  });

  it("offers no reveal control once the last page is loaded", () => {
    mockUpdates.mockReturnValue(page(UPDATE_ROWS, false));
    render(<UpdatesSection projectId={10} />);
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("keeps the only load-more affordance inside the scroll sentinel as a screen-reader fallback, never as a visible button", () => {
    mockUpdates.mockReturnValue(page(UPDATE_ROWS, true));
    render(<UpdatesSection projectId={10} />);
    const fallback = screen.getByRole("button", { name: /load more updates/i });
    expect(fallback).toHaveClass("sr-only");
  });

  it("renders the files section's own page and its empty state, so files never come from the overview", () => {
    mockFiles.mockReturnValue(page([{ id: 3, filename: "brief.pdf", url: "key/3" }], false));
    render(<FilesSection projectId={10} />);
    expect(mockFiles).toHaveBeenCalledWith(10);
    expect(screen.getByText("brief.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download brief.pdf" })).toBeInTheDocument();
  });

  it("renders the requests section's empty state when the page is empty", () => {
    render(<RequestsSection projectId={10} />);
    expect(mockRequests).toHaveBeenCalledWith(10);
    expect(screen.getByText("No requests yet")).toBeInTheDocument();
  });

  it("renders the requests the page returned with their status", () => {
    mockRequests.mockReturnValue(
      page(
        [
          {
            id: 7,
            title: "Add a second milestone",
            status: "submitted",
            decisionComment: null,
            createdAt: "2026-05-01T09:00:00.000Z",
            updatedAt: "2026-05-01T09:00:00.000Z",
          },
        ],
        false,
      ),
    );
    render(<RequestsSection projectId={10} />);
    expect(screen.getByText("Add a second milestone")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });
});
