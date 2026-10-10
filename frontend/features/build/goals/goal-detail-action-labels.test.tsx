import { render, screen } from "@testing-library/react";
import { GoalDetailPage } from "./goal-detail-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/build/goals/1",
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/goals", () => ({
  useGoal: () => ({
    data: {
      id: 1,
      title: "Ship the thing",
      status: "on_track",
      description: null,
      owner: null,
      keyResults: [],
      links: [],
      updates: [],
      progress: 0,
      startDate: null,
      dueDate: null,
      project: null,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useDeleteGoal: () => ({ mutate: jest.fn(), isPending: false }),
  useRemoveGoalLink: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/features/build/goals/goal-form-sheet", () => ({
  GoalFormSheet: () => null,
}));
jest.mock("@/features/build/goals/check-in-dialog", () => ({
  CheckInDialog: () => null,
}));
jest.mock("@/features/build/goals/add-link-dialog", () => ({
  AddLinkDialog: () => null,
}));

const ICON_ONLY_ACTIONS = ["Edit", "Delete"] as const;

describe("goal detail header actions keep an accessible name when their label is hidden", () => {
  it.each(ICON_ONLY_ACTIONS)("%s is announced", (label) => {
    render(<GoalDetailPage goalId={1} />);

    const controls = screen.getAllByRole("button", { name: label });

    expect(
      controls.some((control) => control.getAttribute("aria-label") === label),
    ).toBe(true);
  });

  it("uses the destructive color for the delete icon as well as its label", () => {
    render(<GoalDetailPage goalId={1} />);

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    expect(deleteButton.querySelector(".text-destructive")).toBeInTheDocument();
  });
});
