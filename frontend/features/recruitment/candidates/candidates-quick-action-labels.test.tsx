import { render, screen } from "@testing-library/react";
import { CandidatesPage } from "./candidates-page";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/hr", () => ({
  useUpdateCandidateStage: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteCandidate: () => ({ mutate: jest.fn(), isPending: false }),
  useBulkRejectCandidates: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/hr/recruitment", () => ({
  useCandidatesPage: () => ({
    data: { data: [], statusCounts: {}, pagination: { nextCursor: null, hasMore: false } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/features/recruitment/candidates-list/add-candidate-sheet", () => ({
  AddCandidateSheet: () => null,
}));
jest.mock("@/features/recruitment/candidates-list/edit-candidate-sheet", () => ({
  EditCandidateSheet: () => null,
}));
jest.mock("@/features/recruitment/reject-candidate-dialog", () => ({
  RejectCandidateDialog: () => null,
}));
jest.mock("@/components/hr/recruitment/candidate-comparison-dialog", () => ({
  CandidateComparisonDialog: () => null,
}));

const ICON_ONLY_ACTIONS = ["Select all", "Import", "Add Candidate"] as const;

describe("HRMS-D-002 candidate quick actions keep an accessible name when their label is hidden", () => {
  it.each(ICON_ONLY_ACTIONS)("%s is announced", (label) => {
    render(<CandidatesPage />);

    const controls = screen.getAllByRole(label === "Import" ? "link" : "button", {
      name: label,
    });

    expect(
      controls.some((control) => control.getAttribute("aria-label") === label),
    ).toBe(true);
  });
});
