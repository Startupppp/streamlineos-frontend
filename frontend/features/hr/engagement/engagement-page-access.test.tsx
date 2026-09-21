"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseEngagementOverview = jest.fn();
const mockUseOrgMoodAggregate = jest.fn();
const mockUseMyMoodHistory = jest.fn();

const accessLoading = { data: undefined, isLoading: true };

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "hr:engagement:view": "all" }, modules: {} },
  isLoading: false,
};

const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function emptyQuery() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/hr/engagement",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" }, orgId: "org1" } }),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: () => false,
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/hr/engagement", () => ({
  useEngagementOverview: () => mockUseEngagementOverview(),
  useMyMoodHistory: () => mockUseMyMoodHistory(),
  useOrgMoodAggregate: () => mockUseOrgMoodAggregate(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => emptyQuery(),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/lib/motion-variants", () => ({
  useMotionVariants: () => ({ staggerContainer: {}, fadeUp: {} }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children?: ReactNode; title?: string }) => (
    <div>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

jest.mock("@/features/hr/engagement/mood-checkin-widget", () => ({
  MoodCheckinWidget: () => <div data-testid="mood-checkin-widget" />,
}));

jest.mock("@/features/hr/engagement/recognition-feed", () => ({
  RecognitionFeed: () => null,
  BadgesGrid: () => null,
  PointsLeaderboard: () => null,
  GiveKudosSheet: () => null,
}));

jest.mock("@/features/hr/engagement/polls-tab", () => ({
  PollsTab: () => <div data-testid="polls-tab" />,
}));

jest.mock("@/features/hr/engagement/communities-tab", () => ({
  CommunitiesTab: () => <div data-testid="communities-tab" />,
}));

jest.mock("@/features/hr/engagement/campaigns-tab", () => ({
  CampaignsTab: () => <div data-testid="campaigns-tab" />,
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: () => undefined,
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/lib/query-keys/human-resources", () => ({
  humanResourcesQueryKeys: {
    hr: { hrRecognition: ["hr", "recognition"] },
  },
}));

import { HrEngagementPage } from "./engagement-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseEngagementOverview.mockReturnValue(emptyQuery());
  mockUseOrgMoodAggregate.mockReturnValue({ data: undefined, isLoading: false });
  mockUseMyMoodHistory.mockReturnValue(emptyQuery());
});

describe("HrEngagementPage — access is three-valued, not a boolean", () => {
  it("does not claim denial while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(accessLoading);

    render(<HrEngagementPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows Access Restricted once hr:engagement:view has actually said no", () => {
    mockUseAccess.mockReturnValue(accessDenied);

    render(<HrEngagementPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the engagement page normally when access is granted", () => {
    mockUseAccess.mockReturnValue(accessGranted);

    render(<HrEngagementPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.getByRole("heading", { name: /employee engagement/i })).toBeInTheDocument();
  });
});
