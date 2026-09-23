import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OnboardingDetailPage } from "./onboarding-detail-page";

const mutate = jest.fn();

jest.mock("@/hooks/api/hr/onboarding", () => ({
  useUserOnboarding: () => ({
    data: [
      { id: 1, title: "Sign contract", status: "PENDING", dueDate: null, ownerRole: "NEW_HIRE", canComplete: true, completedAt: null },
      { id: 2, title: "Set up laptop", status: "PENDING", dueDate: null, ownerRole: "NEW_HIRE", canComplete: true, completedAt: null },
    ],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useOnboardingStatus: () => ({
    data: [{ userId: "u1", userName: "Ada" }],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCompleteOnboardingTask: () => ({ mutate, isPending: true }),
}));

describe("marking one onboarding task complete shows pending on that task only", () => {
  beforeEach(() => mutate.mockReset());

  it("leaves every other row interactive while one toggle is in flight", () => {
    render(
      <TooltipProvider>
        <OnboardingDetailPage userId="u1" />
      </TooltipProvider>,
    );

    const buttons = screen.getAllByRole("button", { name: /mark complete/i });
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[0]);

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ taskId: 1, status: "COMPLETED" });

    const after = screen.getAllByRole("button", { name: /mark complete/i });
    expect(after[1]).not.toBeDisabled();
  });
});
