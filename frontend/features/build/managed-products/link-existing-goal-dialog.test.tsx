import { fireEvent, render, screen, act } from "@testing-library/react";
import { LinkExistingGoalDialog } from "./link-existing-goal-dialog";

const mockMutate = jest.fn();
const mockRefetch = jest.fn();
const mockGoalsRefetch = jest.fn();
const mockFetchNextPage = jest.fn();

const GOAL_QA = { id: 38, title: "QA BV Goal", level: "company", productLinkage: null };
const GOAL_LINKED = { id: 37, title: "Linked goal", level: "company", productLinkage: null };
const GOAL_PAGE2 = { id: 99, title: "Page Two Goal", level: "team", productLinkage: null };

function makePage(goals: typeof GOAL_QA[], hasMore: boolean, page: number, total?: number) {
  const pageSize = 25;
  return { items: goals, page, pageSize, total: total ?? goals.length };
}

function defaultCandidatesResult(overrides = {}) {
  return {
    data: {
      pages: [makePage([GOAL_QA, GOAL_LINKED], false, 1, 2)],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockGoalsRefetch,
    fetchNextPage: mockFetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  };
}

jest.mock("./link-existing-goal-goals-query", () => ({
  useLinkGoalCandidates: jest.fn(),
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(() => ({
    data: [GOAL_LINKED],
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  })),
  useLinkGoalProduct: jest.fn(() => ({ mutate: mockMutate, isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const { useLinkGoalCandidates } = jest.requireMock(
  "./link-existing-goal-goals-query",
) as { useLinkGoalCandidates: jest.Mock };

beforeEach(() => {
  mockMutate.mockReset();
  mockRefetch.mockReset();
  mockGoalsRefetch.mockReset();
  mockFetchNextPage.mockReset();
  useLinkGoalCandidates.mockReturnValue(defaultCandidatesResult());
  global.IntersectionObserver = class {
    observe = jest.fn();
    disconnect = jest.fn();
    unobserve = jest.fn();
  } as unknown as typeof IntersectionObserver;
});

function openPicker() {
  render(<LinkExistingGoalDialog managedProductId={39} open onOpenChange={jest.fn()} />);
  fireEvent.click(screen.getByRole("combobox", { name: "Select a goal to link" }));
}

describe("LinkExistingGoalDialog", () => {
  it("keeps the picked goal selected and links it to the product", () => {
    openPicker();
    fireEvent.click(screen.getByRole("option", { name: /QA BV Goal/ }));

    const linkButton = screen.getByRole("button", { name: "Link goal" });
    expect(linkButton).toBeEnabled();
    fireEvent.click(linkButton);

    expect(mockMutate).toHaveBeenCalledWith(
      { goalId: GOAL_QA.id, managedProductId: 39 },
      expect.any(Object),
    );
  });

  it("hides goals already linked to this product and cannot link before a goal is picked", () => {
    openPicker();

    expect(screen.queryByRole("option", { name: /Linked goal/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link goal" })).toBeDisabled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("offers no goals until the product linked goals have loaded", () => {
    const { useGoals } = jest.requireMock("@/hooks/api/goals") as { useGoals: jest.Mock };
    useGoals.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    openPicker();

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByText("Loading goals…")).toBeInTheDocument();
  });

  it("reaches goals past the first page, because a 50-goal limit silently hides the rest", () => {
    useLinkGoalCandidates.mockReturnValue(
      defaultCandidatesResult({
        data: {
          pages: [
            makePage([GOAL_QA, GOAL_LINKED], true, 1, 3),
            makePage([GOAL_PAGE2], false, 2, 3),
          ],
        },
        hasNextPage: false,
      }),
    );

    openPicker();

    expect(screen.getByRole("option", { name: /QA BV Goal/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Page Two Goal/ })).toBeInTheDocument();
  });

  it("typed search is sent to the server rather than filtering one local page", () => {
    let lastParams: { search?: string; enabled?: boolean } | undefined;
    useLinkGoalCandidates.mockImplementation((params) => {
      lastParams = params;
      return defaultCandidatesResult();
    });

    jest.useFakeTimers();
    render(<LinkExistingGoalDialog managedProductId={39} open onOpenChange={jest.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Select a goal to link" }));
    const input = screen.getByPlaceholderText("Search by goal title…");
    fireEvent.change(input, { target: { value: "roadmap" } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(lastParams).toMatchObject({ search: "roadmap" });
    jest.useRealTimers();
  });

  it("error state renders with a retry that re-issues the request, and the dialog stays open", () => {
    const onOpenChange = jest.fn();
    useLinkGoalCandidates.mockReturnValue(
      defaultCandidatesResult({
        data: undefined,
        isError: true,
        error: new Error("Service unavailable"),
      }),
    );

    render(
      <LinkExistingGoalDialog managedProductId={39} open onOpenChange={onOpenChange} />,
    );

    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(mockGoalsRefetch).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("a genuinely empty successful response renders the empty state, not the error state", () => {
    useLinkGoalCandidates.mockReturnValue(
      defaultCandidatesResult({
        data: { pages: [makePage([], false, 1, 0)] },
      }),
    );

    openPicker();

    expect(screen.getByText("No unlinked goals found.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("an already-selected goal stays selected when the loaded page changes", () => {
    const { rerender } = render(
      <LinkExistingGoalDialog managedProductId={39} open onOpenChange={jest.fn()} />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Select a goal to link" }));
    fireEvent.click(screen.getByRole("option", { name: /QA BV Goal/ }));

    useLinkGoalCandidates.mockReturnValue(
      defaultCandidatesResult({
        data: { pages: [makePage([GOAL_PAGE2], false, 1, 1)] },
      }),
    );

    rerender(
      <LinkExistingGoalDialog managedProductId={39} open onOpenChange={jest.fn()} />,
    );

    const trigger = screen.getByRole("combobox", { name: "Select a goal to link" });
    expect(trigger).toHaveTextContent("QA BV Goal");
  });
});
