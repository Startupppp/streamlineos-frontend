import { fireEvent, render } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import MovePageDialog from "./move-page-dialog";

jest.mock("@/hooks/api/kb", () => ({
  useKbPagesSearch: jest.fn(),
  useMoveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
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
