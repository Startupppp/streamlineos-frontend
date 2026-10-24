import { render } from "@testing-library/react";
import {
  baseChannelResult,
  mockUseCanState,
  mockUseCan,
  mockUseCreateEntityChannel,
  mockUseEntityChannel,
  mockUsePageState,
} from "@/features/chat/build-project-chat-page-test-harness";
import { DealDetailBody } from "./deal-detail-body";
import type { Deal } from "@/types/crm";

jest.mock("@/lib/motion-variants", () => ({
  useMotionVariants: () => ({
    staggerContainer: {},
    fadeUp: {},
  }),
}));

jest.mock("@/features/crm/deals/use-deal-layout", () => ({
  useDealLayout: () => [],
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "USD", locale: "en-US" }),
}));

jest.mock("@/components/renderer", () => ({
  RecordDetail: () => null,
  asRecordValue: (v: unknown) => v,
}));

jest.mock("@/lib/renderer/crm/deal-layout", () => ({
  dealRecordFields: () => ({}),
}));

jest.mock("./deal-edit-form", () => ({ DealEditForm: () => null }));
jest.mock("./deal-sidebar-cards", () => ({ DealSidebarCards: () => null }));
jest.mock("./deal-forecast-score-card", () => ({ DealForecastScoreCard: () => null }));
jest.mock("./deal-linked-records-card", () => ({ DealLinkedRecordsCard: () => null }));
jest.mock("./deal-stage-history", () => ({ DealStageHistory: () => null }));
jest.mock("./deal-custom-fields-card", () => ({ DealCustomFieldsCard: () => null }));
jest.mock("./deal-linked-project-card", () => ({ DealLinkedProjectCard: () => null }));
jest.mock("@/features/crm/deals/deal-quotes-section", () => ({ DealQuotesSection: () => null }));

const DEAL_STUB: Deal = {
  id: 7,
  name: "Test Deal",
  stage: "OPEN",
  value: "5000",
  partyId: null,
  subjectId: null,
  pipelineId: 1,
  assignedTo: null,
  lead: null,
  client: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  expectedCloseDate: null,
  actualCloseDate: null,
  customData: null,
  healthScore: null,
  nextStep: null,
  notes: null,
} as unknown as Deal;

const BASE_PROPS = {
  deal: DEAL_STUB,
  dealId: 7,
  stages: [],
  currentStageIndex: -1,
  currentStageColor: null,
  isEditing: false,
  isUpdating: false,
  isCloning: false,
  meetings: [],
  meetingsLoading: false,
  meetingsError: false,
  onStagePipelineClick: jest.fn(),
  onEditSubmit: jest.fn(),
  onCancelEdit: jest.fn(),
  onClone: jest.fn(),
  onRetryMeetings: jest.fn(),
  onQuickActionClick: jest.fn(),
  onAddMeeting: jest.fn(),
  onDeleteMeeting: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseCanState.mockReturnValue("allowed");
  mockUseEntityChannel.mockReturnValue(baseChannelResult());
  mockUseCreateEntityChannel.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("DealDetailBody — chat panel", () => {
  it("calls useEntityChannel with type 'deal' and the dealId as a string", () => {
    render(<DealDetailBody {...BASE_PROPS} dealId={7} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("deal", "7");
  });

  it("calls useEntityChannel with the correct dealId when a different deal is rendered", () => {
    render(<DealDetailBody {...BASE_PROPS} dealId={99} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("deal", "99");
  });

  it("does not render the chat panel when chat access is denied", () => {
    mockUseCanState.mockReturnValue("denied");
    render(<DealDetailBody {...BASE_PROPS} />);
    expect(mockUseEntityChannel).not.toHaveBeenCalled();
  });
});
