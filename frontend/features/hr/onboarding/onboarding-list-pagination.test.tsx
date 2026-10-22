import { fireEvent, render, screen } from "@testing-library/react";
import { OnboardingList } from "./onboarding-list";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));
jest.mock("@/hooks/api/hr/onboarding", () => ({
  useOnboardingStatusPage: (cursor: string | undefined) => ({
    data: cursor === "employee-1"
      ? {
          data: [{ userId: "employee-2", userName: "Second Employee", totalTasks: 1, completedTasks: 0, percentComplete: 0, lastCompletedAt: null }],
          pagination: { limit: 25, hasMore: false, nextCursor: null },
        }
      : {
          data: [{ userId: "employee-1", userName: "First Employee", totalTasks: 1, completedTasks: 0, percentComplete: 0, lastCompletedAt: null }],
          pagination: { limit: 25, hasMore: true, nextCursor: "employee-1" },
        },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock("./onboarding-initiate-sheet", () => ({ OnboardingInitiateSheet: () => null }));
jest.mock("@/components/hr/resend-invite-button", () => ({ ResendInviteButton: () => null }));
jest.mock("@/components/hr/copy-invite-link-button", () => ({ CopyInviteLinkButton: () => null }));

it("walks the bounded onboarding pages without showing the first page's rows on the second", () => {
  render(<OnboardingList />);
  expect(screen.getByText("First Employee")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Second Employee")).toBeInTheDocument();
  expect(screen.queryByText("First Employee")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  expect(screen.getByText("First Employee")).toBeInTheDocument();
});
