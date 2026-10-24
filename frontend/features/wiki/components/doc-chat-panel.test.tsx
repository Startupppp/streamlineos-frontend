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
import PageRightPanel from "./page-right-panel";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPageBacklinks: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
  }),
}));

jest.mock("@/hooks/api/kb/record-links", () => ({
  useKbPageRecordLinks: () => ({ data: [], hasNextPage: false }),
}));

jest.mock("@/hooks/api/kb/activity", () => ({
  useKbPageActivity: () => ({ data: [], isLoading: false, isError: false }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: () => ({ data: { data: [] }, isLoading: false }),
}));

jest.mock("@/lib/api-envelope", () => ({
  isApiError: () => false,
}));

jest.mock("./page-activity-graph", () => ({
  PageActivityGraph: () => null,
}));

jest.mock("./kb-collection-badges", () => ({
  TrustBadge: () => null,
}));

jest.mock("./page-flag-badges", () => ({
  PageFlagBadges: () => null,
}));

jest.mock("@/components/shared/error-reference", () => ({
  ErrorReference: () => null,
}));

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: () => null,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbFileTextIcon: () => null,
}));

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: () => "Test User",
  getUserInitials: () => "TU",
}));

jest.mock("@/features/wiki/lib/kb-date-utils", () => ({
  kbTimeAgo: () => "1 day ago",
  kbFormatDate: () => "Jan 1, 2026",
}));

jest.mock("@/features/wiki/lib/kb-page-status", () => ({
  KB_STATUS_LABELS: {},
  KB_STATUS_BADGE_CLASS: {},
}));

const PAGE_STUB = {
  id: 42,
  title: "Test Page",
  status: "draft",
  visibility: "org",
  lastEditedById: null,
  ownerUserId: null,
  updatedAt: "2026-01-01T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  nextReviewAt: null,
  trustState: null,
  isLocked: false,
  isFavorite: false,
} as unknown as KbPageDetail;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseCanState.mockReturnValue("allowed");
  mockUseEntityChannel.mockReturnValue(baseChannelResult());
  mockUseCreateEntityChannel.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "ok" });
  mockUseChatOutboxDrain.mockReturnValue(undefined);
});

describe("PageRightPanel — doc chat panel", () => {
  it("calls useEntityChannel with type 'doc_page' and the pageId as a string", () => {
    render(<PageRightPanel pageId={42} page={PAGE_STUB} onNavigate={jest.fn()} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("doc_page", "42");
  });

  it("calls useEntityChannel with the correct id for a different page", () => {
    const otherPage = { ...PAGE_STUB, id: 99 } as unknown as KbPageDetail;
    render(<PageRightPanel pageId={99} page={otherPage} onNavigate={jest.fn()} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("doc_page", "99");
  });

  it("does not call useEntityChannel when chat access is denied", () => {
    mockUseCanState.mockReturnValue("denied");
    render(<PageRightPanel pageId={42} page={PAGE_STUB} onNavigate={jest.fn()} />);
    expect(mockUseEntityChannel).not.toHaveBeenCalled();
  });
});
