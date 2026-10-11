import { render, screen } from "@testing-library/react";
import { FeedbackPane } from "./feedback-pane";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/feedbucket/use-feedbucket-submissions", () => ({
  useFeedbucketSubmission: jest.fn(),
  useUnmarkDuplicate: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
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
  linkedTicket: { title: "Fix Friday export", key: "BQS-12" },
  linkedTicketKey: "BQS-12",
  createdAt: "2026-04-11T00:00:00Z",
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
});
