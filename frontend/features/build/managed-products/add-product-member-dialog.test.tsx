import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { AddProductMemberDialog } from "./add-product-member-dialog";

const mockMutate = jest.fn();
const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();

const PAGE_1 = [
  { membershipId: 11, name: "Alice Smith", email: "alice@example.com" },
  { membershipId: 12, name: "Bob Jones", email: "bob@example.com" },
];
const PAGE_2 = [
  { membershipId: 21, name: "Carol Webb", email: "carol@example.com" },
];

function makePaginationDefaults(hasMore: boolean, nextCursor: string | null = null) {
  return { limit: 25, hasMore, nextCursor };
}

function makeQueryResult(overrides: Partial<ReturnType<typeof defaultQueryResult>> = {}) {
  return { ...defaultQueryResult(), ...overrides };
}

function defaultQueryResult() {
  return {
    data: { pages: [{ data: PAGE_1, pagination: makePaginationDefaults(false) }] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
    fetchNextPage: mockFetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

jest.mock("./use-infinite-selector", () => ({
  useAddProductMemberCandidates: jest.fn(),
}));

jest.mock("@/hooks/api/build/managed-product-members", () => ({
  useAddManagedProductMember: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const { useAddProductMemberCandidates } = jest.requireMock(
  "./use-infinite-selector",
) as { useAddProductMemberCandidates: jest.Mock };

beforeEach(() => {
  mockMutate.mockReset();
  mockRefetch.mockReset();
  mockFetchNextPage.mockReset();
  useAddProductMemberCandidates.mockReturnValue(defaultQueryResult());
  global.IntersectionObserver = class {
    observe = jest.fn();
    disconnect = jest.fn();
    unobserve = jest.fn();
  } as unknown as typeof IntersectionObserver;
});

function openPicker() {
  render(
    <AddProductMemberDialog managedProductId={5} open onOpenChange={jest.fn()} />,
  );
  fireEvent.click(screen.getByRole("combobox", { name: "Select a member" }));
}

describe("AddProductMemberDialog", () => {
  it("reaches members past the first page, because a 100-row cap silently hides the rest of a large organization", () => {
    useAddProductMemberCandidates.mockReturnValue(
      makeQueryResult({
        data: {
          pages: [
            { data: PAGE_1, pagination: makePaginationDefaults(true, "cursor_2") },
            { data: PAGE_2, pagination: makePaginationDefaults(false) },
          ],
        },
        hasNextPage: false,
      }),
    );
    openPicker();

    expect(screen.getByRole("option", { name: /Alice Smith/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Bob Jones/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Carol Webb/ })).toBeInTheDocument();
  });

  it("typed search is sent to the server rather than filtering one local page", () => {
    let lastParams: { search?: string; enabled?: boolean } | undefined;
    useAddProductMemberCandidates.mockImplementation((params) => {
      lastParams = params;
      return defaultQueryResult();
    });

    jest.useFakeTimers();
    render(
      <AddProductMemberDialog managedProductId={5} open onOpenChange={jest.fn()} />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Select a member" }));
    const input = screen.getByPlaceholderText("Search by name or email…");
    fireEvent.change(input, { target: { value: "alice" } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(lastParams).toMatchObject({ search: "alice" });
    jest.useRealTimers();
  });

  it("error state renders with a retry that re-issues the request, and the dialog stays open", () => {
    const onOpenChange = jest.fn();
    useAddProductMemberCandidates.mockReturnValue(
      makeQueryResult({
        data: undefined,
        isError: true,
        error: new Error("Network failure"),
      }),
    );

    render(
      <AddProductMemberDialog managedProductId={5} open onOpenChange={onOpenChange} />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("a genuinely empty successful response renders the empty state, not the error state", () => {
    useAddProductMemberCandidates.mockReturnValue(
      makeQueryResult({
        data: { pages: [{ data: [], pagination: makePaginationDefaults(false) }] },
      }),
    );

    openPicker();

    expect(screen.getByText("No members found.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("an already-selected member stays in the selector when the loaded page changes", () => {
    const { rerender } = render(
      <AddProductMemberDialog managedProductId={5} open onOpenChange={jest.fn()} />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Select a member" }));
    fireEvent.click(screen.getByRole("option", { name: /Alice Smith/ }));

    useAddProductMemberCandidates.mockReturnValue(
      makeQueryResult({
        data: {
          pages: [{ data: PAGE_2, pagination: makePaginationDefaults(false) }],
        },
      }),
    );

    rerender(
      <AddProductMemberDialog managedProductId={5} open onOpenChange={jest.fn()} />,
    );

    const trigger = screen.getByRole("combobox", { name: "Select a member" });
    expect(trigger).toHaveTextContent("Alice Smith");
  });

  it("submits the selected member and role to the mutation", async () => {
    render(
      <AddProductMemberDialog managedProductId={5} open onOpenChange={jest.fn()} />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Select a member" }));
    fireEvent.click(screen.getByRole("option", { name: /Alice Smith/ }));

    await act(async () => {
      fireEvent.submit(document.getElementById("add-product-member-form")!);
    });

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { organizationMembershipId: PAGE_1[0]!.membershipId, role: "member" },
        expect.any(Object),
      );
    });
  });
});
