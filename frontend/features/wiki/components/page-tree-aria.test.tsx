import { render, screen } from "@testing-library/react";
import PageTree from "./page-tree";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/knowledge/wiki",
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPageTreeInfinite: jest.fn(),
  useCreateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useKbPageChildrenLevel: jest.fn(),
  useDeleteKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useDuplicateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useToggleFavoriteKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const { useKbPageTreeInfinite, useKbPageChildrenLevel } = jest.requireMock(
  "@/hooks/api/kb",
) as {
  useKbPageTreeInfinite: jest.Mock;
  useKbPageChildrenLevel: jest.Mock;
};

function makeNode(id: number, title: string, hasChildren = false) {
  return {
    id,
    title,
    icon: null,
    hasChildren,
    spaceId: null,
    projectId: null,
    contentRevision: 1,
  };
}

const emptyChildrenQuery = {
  data: undefined,
  isLoading: false,
  isError: false,
  isFetchNextPageError: false,
  error: null,
  refetch: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: jest.fn(),
};

describe("PageTree — ARIA tree semantics", () => {
  beforeEach(() => {
    useKbPageChildrenLevel.mockReturnValue(emptyChildrenQuery);
  });

  it("renders the container with role=tree", () => {
    useKbPageTreeInfinite.mockReturnValue({
      data: { pages: [{ data: [makeNode(1, "Page A")] }] },
      isLoading: false,
      isError: false,
      isFetchNextPageError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<PageTree />);

    expect(screen.getByRole("tree")).toBeInTheDocument();
  });

  it("renders each page node with role=treeitem", () => {
    useKbPageTreeInfinite.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              makeNode(1, "Page A"),
              makeNode(2, "Page B"),
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
      isFetchNextPageError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<PageTree />);

    const treeItems = screen.getAllByRole("treeitem");
    expect(treeItems).toHaveLength(2);
  });

  it("sets aria-level=1 on root nodes", () => {
    useKbPageTreeInfinite.mockReturnValue({
      data: { pages: [{ data: [makeNode(1, "Root")] }] },
      isLoading: false,
      isError: false,
      isFetchNextPageError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<PageTree />);

    expect(screen.getByRole("treeitem", { name: /Root/ })).toHaveAttribute("aria-level", "1");
  });

  it("sets aria-setsize and aria-posinset on root nodes", () => {
    useKbPageTreeInfinite.mockReturnValue({
      data: {
        pages: [
          {
            data: [makeNode(1, "First"), makeNode(2, "Second")],
          },
        ],
      },
      isLoading: false,
      isError: false,
      isFetchNextPageError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<PageTree />);

    const firstItem = screen.getByRole("treeitem", { name: /First/ });
    const secondItem = screen.getByRole("treeitem", { name: /Second/ });

    expect(firstItem).toHaveAttribute("aria-setsize", "2");
    expect(firstItem).toHaveAttribute("aria-posinset", "1");
    expect(secondItem).toHaveAttribute("aria-setsize", "2");
    expect(secondItem).toHaveAttribute("aria-posinset", "2");
  });

  it("does not set aria-expanded on leaf nodes", () => {
    useKbPageTreeInfinite.mockReturnValue({
      data: { pages: [{ data: [makeNode(1, "Leaf", false)] }] },
      isLoading: false,
      isError: false,
      isFetchNextPageError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<PageTree />);

    const item = screen.getByRole("treeitem");
    expect(item).not.toHaveAttribute("aria-expanded");
  });

  it("sets aria-expanded=false on a collapsed node that has children", () => {
    useKbPageTreeInfinite.mockReturnValue({
      data: { pages: [{ data: [makeNode(1, "Parent", true)] }] },
      isLoading: false,
      isError: false,
      isFetchNextPageError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<PageTree />);

    const item = screen.getByRole("treeitem");
    expect(item).toHaveAttribute("aria-expanded", "false");
  });
});
