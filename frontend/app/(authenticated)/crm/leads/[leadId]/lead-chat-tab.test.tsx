import { render } from "@testing-library/react";
import {
  baseChannelResult,
  mockUseCanState,
  mockUseCan,
  mockUseChatOutboxDrain,
  mockUseCreateEntityChannel,
  mockUseEntityChannel,
  mockUsePageState,
} from "@/features/chat/build-project-chat-page-test-harness";
import LeadDetailPage from "./page";

function resolvedParams<T>(value: T): Promise<T> {
  const p = Promise.resolve(value) as Promise<T> & { status: string; value: T };
  p.status = "fulfilled";
  p.value = value;
  return p;
}

jest.mock("@/hooks/api/leads", () => ({
  useLeadDetail: () => ({
    data: {
      id: 3,
      name: "Test Lead",
      email: null,
      status: "NEW",
      priority: null,
      potentialValue: null,
      customData: null,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useLeadTimeline: () => ({ data: [], isLoading: false }),
  useUpdateLeadStatus: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/lib/motion-variants", () => ({
  useMotionVariants: () => ({ staggerContainer: {}, fadeUp: {} }),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => null,
}));

jest.mock("@/features/crm/shared/crm-inline-ai-menu", () => ({
  LeadInlineAiMenu: () => null,
}));
jest.mock("@/features/crm/leads/detail/lead-detail-header", () => ({
  LeadDetailHeader: () => null,
}));
jest.mock("@/features/crm/leads/detail/lead-info-card", () => ({
  LeadInfoCard: () => null,
}));
jest.mock("@/features/crm/leads/detail/lead-quick-actions", () => ({
  LeadQuickActions: () => null,
}));
jest.mock("@/features/crm/leads/detail/lead-sidebar", () => ({
  LeadSidebar: () => null,
}));
jest.mock("@/features/crm/leads/detail/lead-qualification-panel", () => ({
  LeadQualificationPanel: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseCanState.mockReturnValue("allowed");
  mockUseEntityChannel.mockReturnValue(baseChannelResult());
  mockUseCreateEntityChannel.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "loading" });
  mockUseChatOutboxDrain.mockReturnValue(undefined);
});

describe("LeadDetailPage — chat tab", () => {
  it("calls useEntityChannel with type 'lead' and the leadId as a string", () => {
    render(<LeadDetailPage params={resolvedParams({ leadId: "3" })} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("lead", "3");
  });

  it("calls useEntityChannel with the correct id for a different lead", () => {
    render(<LeadDetailPage params={resolvedParams({ leadId: "77" })} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("lead", "77");
  });

  it("does not render the chat panel when chat access is denied", () => {
    mockUseCanState.mockReturnValue("denied");
    render(<LeadDetailPage params={resolvedParams({ leadId: "3" })} />);
    expect(mockUseEntityChannel).not.toHaveBeenCalled();
  });
});
