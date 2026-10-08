import { fireEvent, render, screen } from "@testing-library/react";
import { WorkspaceSearchResults } from "./workspace-search-results";

const fetchProjects = jest.fn();
const fetchProducts = jest.fn();
const fetchTickets = jest.fn();
const navigateDocument = jest.fn();

const projectQuery = jest.fn();
const productQuery = jest.fn();
const ticketQuery = jest.fn();
const pageStateQuery = jest.fn();

jest.mock("@/hooks/api/build/projects", () => ({
  useInfiniteProjects: (...args: unknown[]) => projectQuery(...args),
}));
jest.mock("@/hooks/api/build/managed-products", () => ({
  useInfiniteManagedProducts: (...args: unknown[]) => productQuery(...args),
}));
jest.mock("@/hooks/api/build/all-work", () => ({
  useInfiniteAllWork: (...args: unknown[]) => ticketQuery(...args),
}));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => pageStateQuery(...args),
}));
jest.mock("@/hooks/common/use-guarded-document-navigation", () => ({
  useGuardedDocumentNavigation: () => navigateDocument,
}));
jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: ({
    hasNextPage,
    label,
    onLoadMore,
  }: {
    hasNextPage: boolean;
    label: string;
    onLoadMore: () => void;
  }) => hasNextPage ? <button onClick={onLoadMore}>{label}</button> : null,
}));

function queryResult(data: unknown, fetchNextPage: () => void) {
  return {
    data,
    error: null,
    isLoading: false,
    isError: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage,
    refetch: jest.fn(),
  };
}

describe("WorkspaceSearchResults", () => {
  beforeEach(() => {
    fetchProjects.mockClear();
    fetchProducts.mockClear();
    fetchTickets.mockClear();
    navigateDocument.mockClear();
    pageStateQuery.mockReturnValue({ kind: "ready" });
    projectQuery.mockReturnValue(queryResult({ pages: [{ data: [{ id: 1, name: "Web", key: "WEB" }] }] }, fetchProjects));
    productQuery.mockReturnValue(queryResult({ pages: [{ data: [{ id: 2, name: "Portal", key: "PORTAL" }] }] }, fetchProducts));
    ticketQuery.mockReturnValue(queryResult({ pages: [{ data: [{
      id: 3,
      title: "Fix upload",
      projectId: 1,
      projectKey: "WEB",
      projectName: "Web",
      ticketNumber: 42,
    }] }] }, fetchTickets));
  });

  it("uses cursor-backed sentinels for every Build result collection", () => {
    render(<WorkspaceSearchResults query="upload" onOpenResult={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Load more projects" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more managed products" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more tickets" }));

    expect(fetchProjects).toHaveBeenCalledTimes(1);
    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(fetchTickets).toHaveBeenCalledTimes(1);
  });

  it("uses guarded document navigation for ticket results", () => {
    render(<WorkspaceSearchResults query="upload" onOpenResult={jest.fn()} />);

    fireEvent.click(screen.getByRole("link", { name: /Fix upload/ }));

    expect(navigateDocument).toHaveBeenCalledWith("/build/1/tickets/WEB-42");
  });

  it("preserves modified ticket-link activation for a new tab", () => {
    render(<WorkspaceSearchResults query="upload" onOpenResult={jest.fn()} />);

    fireEvent.click(screen.getByRole("link", { name: /Fix upload/ }), {
      altKey: true,
    });

    expect(navigateDocument).not.toHaveBeenCalled();
  });

  it("renders access denial through the shared page-state component", () => {
    pageStateQuery.mockReturnValue({ kind: "denied", permission: "build:view" });

    render(<WorkspaceSearchResults query="upload" onOpenResult={jest.fn()} />);

    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
    expect(screen.queryByText("Fix upload")).not.toBeInTheDocument();
  });
});
