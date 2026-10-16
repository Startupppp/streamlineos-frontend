import { fireEvent, render } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import QuickFindDialog from "./quick-find-dialog";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (value: string) => value,
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPagesSearch: jest.fn(),
}));

const { useKbPagesSearch } = jest.requireMock<{ useKbPagesSearch: jest.Mock }>("@/hooks/api/kb");

it("reports a failed first Quick Find read without calling it an empty result", () => {
  useKbPagesSearch.mockReturnValue({
    isFetching: false,
    isError: true,
    error: new ApiError("Service unavailable", 503, "UNAVAILABLE", { correlationId: "req-quick-find-first" }, "/kb/pages/search"),
    refetch: jest.fn(),
  });

  const view = render(<QuickFindDialog open onOpenChange={jest.fn()} />);
  fireEvent.change(view.getByPlaceholderText("Search pages…"), { target: { value: "missing" } });

  expect(view.queryByText(/No pages found/)).not.toBeInTheDocument();
  expect(view.getByRole("alert")).toHaveTextContent("Couldn't search pages");
  expect(view.getByText("req-quick-find-first")).toBeInTheDocument();
});

it("reports a failed Quick Find search and hides cached results after access is revoked", () => {
  const refetch = jest.fn();
  useKbPagesSearch.mockReturnValue({
    data: { items: [{ id: 2, title: "Formerly visible page", icon: null, snippet: null }], hasMore: false },
    isFetching: false,
    isError: true,
    error: new ApiError("Access denied", 403, "FORBIDDEN", { correlationId: "req-quick-find" }, "/kb/pages/search"),
    refetch,
  });

  const view = render(<QuickFindDialog open onOpenChange={jest.fn()} />);
  fireEvent.change(view.getByPlaceholderText("Search pages…"), { target: { value: "visible" } });

  expect(view.queryByText("Formerly visible page")).not.toBeInTheDocument();
  expect(view.queryByText(/No pages found/)).not.toBeInTheDocument();
  expect(view.getByRole("alert")).toHaveTextContent("Access denied");
  expect(view.getByText("req-quick-find")).toBeInTheDocument();
  fireEvent.click(view.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});
