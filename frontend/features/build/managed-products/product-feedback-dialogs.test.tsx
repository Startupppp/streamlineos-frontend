import { render } from "@testing-library/react";
import { ProductFeedbackDialogs } from "./product-feedback-dialogs";
import type { useProductFeedbackFilters } from "./use-product-feedback-filters";
import type { useRouteToIntake } from "./feedback/route-to-intake-dialog";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("status=open&submission=41&ticket=9&ticketProject=6"),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => (cb: () => void) => cb(),
}));

jest.mock("./feedback/feedback-pane", () => ({
  FeedbackPane: () => null,
}));

jest.mock("./feedback/capture-submission-sheet", () => ({
  CaptureSubmissionSheet: () => null,
}));

jest.mock("./feedback/feedbucket-collect-dialog", () => ({
  FeedbucketCollectDialog: () => null,
}));

jest.mock("./feedback/route-to-intake-dialog", () => ({
  RouteToIntakeDialog: () => null,
}));

jest.mock("@/features/build/ticket-details/ticket-detail-pane", () => ({
  TicketDetailPane: jest.fn(() => null),
}));

const { TicketDetailPane } = jest.requireMock(
  "@/features/build/ticket-details/ticket-detail-pane",
) as { TicketDetailPane: jest.Mock };

function makeFilterState(overrides?: Partial<ReturnType<typeof useProductFeedbackFilters>>): ReturnType<typeof useProductFeedbackFilters> {
  const base: ReturnType<typeof useProductFeedbackFilters> = {
    listFilters: { setValue: jest.fn(), setValues: jest.fn(), clearAll: jest.fn(), value: jest.fn(() => "all"), isActive: jest.fn(() => false), activeCount: 0, isFiltered: false, search: "", debouncedSearch: "", setSearch: jest.fn(), cursor: null, setCursor: jest.fn(), resetKey: "", isPending: false, searchParams: new URLSearchParams() },
    searchInputRef: { current: null },
    page: 1,
    selected: new Set(),
    setSelected: jest.fn(),
    managedProductId: 7,
    queryParams: { managedProductId: 7, page: 1, limit: 25 },
    bulkFilters: { managedProductId: 7 },
    typeValue: "all",
    linkedValue: "all",
    assigneeIdValue: "all",
    duplicateValue: "all",
    consentStatusValue: "all",
    linkedToOpportunityValue: "all",
    typedFrom: undefined,
    typedTo: undefined,
    appliedStatuses: undefined,
    appliedAssigneeIds: undefined,
    paneSubmissionId: 41,
    paneTicketId: 9,
    paneTicketProjectId: 6,
    dateRangeReversed: false,
    isFiltered: true,
    appliedSourceChannels: undefined,
    appliedThemes: undefined,
    appliedSentiments: undefined,
    appliedSegments: undefined,
    appliedCrmOrgIds: undefined,
    appliedConsentStatus: undefined,
    handleTypeChange: jest.fn(),
    handleStatusValuesChange: jest.fn(),
    handleLinkedChange: jest.fn(),
    handleAssigneeValuesChange: jest.fn(),
    handleDuplicateChange: jest.fn(),
    handleConsentStatusChange: jest.fn(),
    handleLinkedToOpportunityChange: jest.fn(),
    handleSourceChannelValuesChange: jest.fn(),
    handleThemeValuesChange: jest.fn(),
    handleSentimentValuesChange: jest.fn(),
    handleSegmentValuesChange: jest.fn(),
    handleCrmOrgValuesChange: jest.fn(),
    handleDateRangeChange: jest.fn(),
    handlePageChange: jest.fn(),
    handleClearSelection: jest.fn(),
    handleOpenTicket: jest.fn(),
    handleCloseTicketPane: jest.fn(),
    handleOpenSubmission: jest.fn(),
    handleCloseSubmissionPane: jest.fn(),
  };
  return { ...base, ...overrides };
}

const INTAKE_ROUTING: ReturnType<typeof useRouteToIntake> = {
  target: null,
  mutation: { mutate: jest.fn(), isPending: false } as never,
  handleRouteToIntake: jest.fn(),
  handleTargetOpenChange: jest.fn(),
};

describe("ProductFeedbackDialogs — nested ticket pane", () => {
  beforeEach(() => {
    TicketDetailPane.mockClear();
  });

  it("renders TicketDetailPane when paneTicketId and paneTicketProjectId are set", () => {
    render(
      <ProductFeedbackDialogs
        managedProductId={7}
        filterState={makeFilterState()}
        rows={[]}
        canCapture={false}
        canOpenSubmissionDetail={false}
        captureOpen={false}
        feedbucketOpen={false}
        onCaptureOpenChange={jest.fn()}
        onFeedbucketOpenChange={jest.fn()}
        intakeRouting={INTAKE_ROUTING}
      />,
    );

    expect(TicketDetailPane).toHaveBeenCalled();
    const props = TicketDetailPane.mock.calls[0]?.[0] as { ticketId: number; projectId: number; originHref: string };
    expect(props.ticketId).toBe(9);
    expect(props.projectId).toBe(6);
  });

  it("builds originHref from current URL params minus ticket/ticketProject, preserving other filters", () => {
    render(
      <ProductFeedbackDialogs
        managedProductId={7}
        filterState={makeFilterState()}
        rows={[]}
        canCapture={false}
        canOpenSubmissionDetail={false}
        captureOpen={false}
        feedbucketOpen={false}
        onCaptureOpenChange={jest.fn()}
        onFeedbucketOpenChange={jest.fn()}
        intakeRouting={INTAKE_ROUTING}
      />,
    );

    const props = TicketDetailPane.mock.calls[0]?.[0] as { originHref: string };
    const url = new URL(props.originHref, "https://x");
    expect(url.searchParams.get("status")).toBe("open");
    expect(url.searchParams.get("submission")).toBe("41");
    expect(url.searchParams.has("ticket")).toBe(false);
    expect(url.searchParams.has("ticketProject")).toBe(false);
  });

  it("does not render TicketDetailPane when paneTicketId is null", () => {
    render(
      <ProductFeedbackDialogs
        managedProductId={7}
        filterState={makeFilterState({ paneTicketId: null })}
        rows={[]}
        canCapture={false}
        canOpenSubmissionDetail={false}
        captureOpen={false}
        feedbucketOpen={false}
        onCaptureOpenChange={jest.fn()}
        onFeedbucketOpenChange={jest.fn()}
        intakeRouting={INTAKE_ROUTING}
      />,
    );

    expect(TicketDetailPane).not.toHaveBeenCalled();
  });
});
