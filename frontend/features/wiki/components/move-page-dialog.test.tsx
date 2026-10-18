import { fireEvent, render } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import MovePageDialog from "./move-page-dialog";

const mockMove = jest.fn();

jest.mock("@/hooks/api/kb", () => ({
  useKbPagesSearch: jest.fn(),
  useMoveKbPage: jest.fn(() => ({ mutate: mockMove, isPending: false })),
  useKbSpaces: jest.fn(() => ({
    data: {
      data: [{ id: 4, name: "Operations", icon: "🛠" }, { id: 5, name: "Legal", icon: "" }],
      pagination: { limit: 100, hasMore: false, nextCursor: null },
    },
  })),
}));

const { useKbPagesSearch } = jest.requireMock<{ useKbPagesSearch: jest.Mock }>("@/hooks/api/kb");

beforeEach(() => {
  jest.clearAllMocks();
  useKbPagesSearch.mockReturnValue({
    data: { items: [] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
});

it("shows an empty result only after a successful parent-page search", () => {
  const view = render(<MovePageDialog pageId={1} currentParentId={null} open onOpenChange={jest.fn()} />);

  fireEvent.change(view.getByPlaceholderText("Search pages…"), { target: { value: "missing" } });

  expect(view.getByText("No pages found")).toBeInTheDocument();
  expect(view.queryByRole("alert")).not.toBeInTheDocument();
});

it("shows a failed search with its request reference and retry instead of an empty result or stale parent", () => {
  const refetch = jest.fn();
  useKbPagesSearch.mockReturnValue({
    data: { items: [{ id: 2, title: "Former parent", icon: null }] },
    isLoading: false,
    isError: true,
    error: new ApiError("Access denied", 403, "FORBIDDEN", { correlationId: "req-move-search" }, "/kb/pages/search"),
    refetch,
  });
  const view = render(<MovePageDialog pageId={1} currentParentId={null} open onOpenChange={jest.fn()} />);

  fireEvent.change(view.getByPlaceholderText("Search pages…"), { target: { value: "parent" } });

  expect(view.queryByText("No pages found")).not.toBeInTheDocument();
  expect(view.queryByText("Former parent")).not.toBeInTheDocument();
  expect(view.getByRole("alert")).toHaveTextContent("Access denied");
  expect(view.getByText("req-move-search")).toBeInTheDocument();
  fireEvent.click(view.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("moves a page to the top level of a chosen space", () => {
  const view = render(<MovePageDialog pageId={1} currentParentId={9} open onOpenChange={jest.fn()} />);

  fireEvent.click(view.getByRole("button", { name: /Top of Operations/ }));
  fireEvent.click(view.getByRole("button", { name: "Move here" }));

  expect(mockMove).toHaveBeenCalledWith({ pageId: 1, parentPageId: null, spaceId: 4, index: 0 }, expect.anything());
});

it("keeps the page's space when moved to the workspace root, and sends no space with a parent page", () => {
  useKbPagesSearch.mockReturnValue({
    data: { items: [{ id: 2, title: "Parent page", icon: null }] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  const view = render(<MovePageDialog pageId={1} currentParentId={9} open onOpenChange={jest.fn()} />);

  fireEvent.click(view.getByRole("button", { name: /Top of Legal/ }));
  fireEvent.click(view.getByRole("button", { name: "Workspace root" }));
  fireEvent.click(view.getByRole("button", { name: "Move here" }));
  expect(mockMove).toHaveBeenLastCalledWith({ pageId: 1, parentPageId: null, index: 0 }, expect.anything());

  fireEvent.change(view.getByPlaceholderText("Search pages…"), { target: { value: "parent" } });
  fireEvent.click(view.getByRole("button", { name: /Top of Legal/ }));
  fireEvent.click(view.getByRole("button", { name: /Parent page/ }));
  fireEvent.click(view.getByRole("button", { name: "Move here" }));
  expect(mockMove).toHaveBeenLastCalledWith({ pageId: 1, parentPageId: 2, index: 0 }, expect.anything());
});
