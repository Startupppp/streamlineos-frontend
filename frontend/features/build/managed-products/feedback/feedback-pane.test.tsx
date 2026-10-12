import { fireEvent, render, screen } from "@testing-library/react";
import { FeedbackPane } from "./feedback-pane";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/feedbucket/use-feedbucket-submissions", () => ({
  useFeedbucketSubmission: jest.fn(),
  useUnmarkDuplicate: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <div role="alert" data-testid="error-state">
      Error loading data.
      {onRetry ? <button type="button" onClick={onRetry}>Try again</button> : null}
    </div>
  ),
}));

jest.mock("./use-submission-opportunities", () => ({
  useProductOpportunitiesSearch: jest.fn(() => ({
    data: { data: [{ id: 10, title: "Speed up checkout", state: "identified" }] },
    isLoading: false,
  })),
  useAddEvidenceToOpportunity: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const { useFeedbucketSubmission } = jest.requireMock(
  "@/hooks/api/feedbucket/use-feedbucket-submissions",
) as { useFeedbucketSubmission: jest.Mock };

const SUBMISSION = {
  id: 41,
  message: "Export fails on Friday",
  type: "bug",
  status: "open",
  sourceChannel: "email",
  sentiment: "negative",
  theme: "Reliability",
  segment: "Enterprise",
  consentStatus: "granted",
  consentRecordedAt: "2026-04-12T00:00:00Z",
  reporterName: "Ada Lovelace",
  reporterEmail: "ada@example.com",
  pageUrl: "https://app.example.com/export",
  duplicateOfId: null,
  duplicateCount: 2,
  opportunityIds: [10],
  linkedTicket: { id: 9, orgId: "org1", projectId: 6, title: "Fix Friday export", type: "bug", status: "open" },
  linkedTicketKey: "BQS-12",
  createdAt: "2026-04-11T00:00:00Z",
  accountValueSnapshot: null,
  aiType: null,
  aiModel: null,
  aiConfidence: null,
  assignee: null,
  revision: "2026-04-11T00:00:00Z",
  sourceFreshness: "2026-04-11T00:00:00Z",
  allowedActions: [] as string[],
};

describe("FeedbackPane", () => {
  beforeEach(() => {
    useFeedbucketSubmission.mockReturnValue({ data: SUBMISSION, isLoading: false });
  });

  it("renders the inbox pane with tone badges and names instead of raw ids", () => {
    render(
      <FeedbackPane
        submissionId={41}
        managedProductId={7}
        open
        onOpenChange={jest.fn()}
        onOpenDetail={jest.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Export fails on Friday" })).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
    expect(screen.getByText("3 reports")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Speed up checkout")).toBeInTheDocument();
    expect(screen.getByText("Fix Friday export")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open full details" })).toBeInTheDocument();
    expect(screen.queryByText(/[0-9a-f]{8}-[0-9a-f]{4}/i)).not.toBeInTheDocument();
    expect(screen.queryByText("#10")).not.toBeInTheDocument();
    expect(screen.queryByText("#41")).not.toBeInTheDocument();
  });

  it("hides the reporter when consent is denied", () => {
    useFeedbucketSubmission.mockReturnValue({
      data: { ...SUBMISSION, consentStatus: "denied" },
      isLoading: false,
    });
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.getByText("Denied")).toBeInTheDocument();
  });

  it("renders the linked ticket as a navigable link to the ticket detail page", () => {
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    const ticketLink = screen.getByRole("link", { name: "Fix Friday export" });
    expect(ticketLink).toHaveAttribute("href", "/build/6/tickets/BQS-12");
  });

  it("shows account value snapshot when present", () => {
    useFeedbucketSubmission.mockReturnValue({
      data: { ...SUBMISSION, accountValueSnapshot: "$12,000/yr" },
      isLoading: false,
    });
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.getByText("$12,000/yr")).toBeInTheDocument();
  });

  it("omits account value row when accountValueSnapshot is null", () => {
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByText("Account value")).not.toBeInTheDocument();
  });

  it("shows AI suggestion label with model and confidence when aiType and aiModel are present", () => {
    useFeedbucketSubmission.mockReturnValue({
      data: {
        ...SUBMISSION,
        aiType: "feature",
        aiModel: "gpt-4o",
        aiConfidence: 0.87,
      },
      isLoading: false,
    });
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    const label = screen.getByTestId("ai-suggestion-label");
    expect(label).toHaveTextContent("AI suggestion");
    expect(label).toHaveTextContent("gpt-4o");
    expect(label).toHaveTextContent("87%");
  });

  it("omits AI suggestion label when aiType is absent", () => {
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByTestId("ai-suggestion-label")).not.toBeInTheDocument();
  });

  it("shows owner name when assignee is present", () => {
    useFeedbucketSubmission.mockReturnValue({
      data: {
        ...SUBMISSION,
        assignee: { id: 5, name: "Grace Hopper", avatarUrl: null },
      },
      isLoading: false,
    });
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("omits owner row when assignee is null", () => {
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
  });

  it("shows mark-duplicate button when allowedActions includes markDuplicate", () => {
    useFeedbucketSubmission.mockReturnValue({
      data: { ...SUBMISSION, allowedActions: ["markDuplicate"] },
      isLoading: false,
    });
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Mark duplicate" })).toBeInTheDocument();
  });

  it("hides mark-duplicate button when allowedActions does not include it and canUpdate is false", () => {
    useFeedbucketSubmission.mockReturnValue({
      data: { ...SUBMISSION, allowedActions: [] },
      isLoading: false,
    });
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Mark duplicate" })).not.toBeInTheDocument();
  });
});

describe("FeedbackPane — error and retry states (MP-02)", () => {
  it("renders an error state with retry when the submission fetch fails, so a failed read is never shown as not-found", () => {
    const mockRefetch = jest.fn();
    useFeedbucketSubmission.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByText("Submission not found.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the sheet open when retrying after a failed submission fetch", () => {
    useFeedbucketSubmission.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network error"),
      refetch: jest.fn(),
    });
    const onOpenChange = jest.fn();
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={onOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows not-found text when fetch succeeds with no data, not the error state", () => {
    useFeedbucketSubmission.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(
      <FeedbackPane submissionId={41} managedProductId={7} open onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    expect(screen.getByText("Submission not found.")).toBeInTheDocument();
  });
});
