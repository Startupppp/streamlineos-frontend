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
import ClientDetailPage from "./page";

function resolvedParams<T>(value: T): Promise<T> {
  const p = Promise.resolve(value) as Promise<T> & { status: string; value: T };
  p.status = "fulfilled";
  p.value = value;
  return p;
}

jest.mock("@/hooks/api/crm/clients", () => ({
  useClientAccount: () => ({
    data: {
      clientName: "Test Client",
      status: "INVESTED",
      planName: null,
      leadId: 10,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    access: { denied: false, permission: "crm:clients:read" },
  }),
}));

jest.mock("@/hooks/api/crm", () => ({
  useClient360: () => ({ data: undefined, isLoading: false }),
}));

jest.mock("@/lib/motion-variants", () => ({
  useMotionVariants: () => ({ staggerContainer: {}, fadeUp: {} }),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => null,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => null,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/crm/clients/client-overview-tab", () => ({
  ClientOverviewTab: () => null,
}));
jest.mock("@/features/crm/clients/client-timeline-tab", () => ({
  ClientTimelineTab: () => null,
}));
jest.mock("@/features/crm/clients/client-opportunities-tab", () => ({
  ClientOpportunitiesTab: () => null,
}));
jest.mock("@/features/crm/clients/client-onboarding-tab", () => ({
  ClientOnboardingTab: () => null,
}));
jest.mock("@/features/crm/shared/customer-360-section", () => ({
  Customer360Section: () => null,
}));
jest.mock("@/features/crm/shared/crm-inline-ai-menu-account", () => ({
  AccountInlineAiMenu: () => null,
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

describe("ClientDetailPage — chat tab", () => {
  it("calls useEntityChannel with type 'client' and the clientId as a string", () => {
    render(<ClientDetailPage params={resolvedParams({ clientId: "5" })} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("client", "5");
  });

  it("calls useEntityChannel with the correct id for a different client", () => {
    render(<ClientDetailPage params={resolvedParams({ clientId: "88" })} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("client", "88");
  });

  it("does not render the chat panel when chat access is denied", () => {
    mockUseCanState.mockReturnValue("denied");
    render(<ClientDetailPage params={resolvedParams({ clientId: "5" })} />);
    expect(mockUseEntityChannel).not.toHaveBeenCalled();
  });
});
