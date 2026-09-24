"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseEngagementOverview = jest.fn();
const mockUseOrgMoodAggregate = jest.fn();
const mockUseMyMoodHistory = jest.fn();
const mockUseCan = jest.fn();
const mockUseQuery = jest.fn();

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
  useCan: () => mockUseCan(),
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
  useQuery: () => mockUseQuery(),
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
  // The shared error state renders a copyable request reference, which reads the id through this.
  getCorrelationId: () => undefined,
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
  mockUseCan.mockReturnValue(false);
  mockUseQuery.mockReturnValue(emptyQuery());
  mockUseEngagementOverview.mockReturnValue(emptyQuery());
  mockUseOrgMoodAggregate.mockReturnValue(emptyQuery());
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
    expect(screen.getByRole("heading", { name: "Polls & engagement" })).toBeInTheDocument();
  });
});

describe("HrEngagementPage overview is honest about failed reads", () => {
  const refetchMood = jest.fn();

  function failedQuery() {
    return {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Internal server error"),
      refetch: refetchMood,
    };
  }

  it("shows the recognitions stat as unknown, not zero, when the recognitions read fails", () => {
    mockUseQuery.mockReturnValue(failedQuery());

    render(<HrEngagementPage />);

    expect(screen.getAllByText("Couldn't load").length).toBeGreaterThan(0);
    expect(screen.queryByText("All time")).toBeNull();
  });

  it("offers retry on the mood trend instead of 'No mood check-ins yet' when the mood read fails", () => {
    mockUseCan.mockReturnValue(true);
    mockUseOrgMoodAggregate.mockReturnValue(failedQuery());

    render(<HrEngagementPage />);

    expect(screen.queryByText(/no mood check-ins yet/i)).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load the mood trend/i);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetchMood).toHaveBeenCalledTimes(1);
  });

  it("keeps 'No mood check-ins yet' for a mood read that succeeded with nothing to show", () => {
    mockUseCan.mockReturnValue(true);
    mockUseOrgMoodAggregate.mockReturnValue({ ...emptyQuery(), data: { minResponses: 5, suppressedDays: 0, points: [] } });

    render(<HrEngagementPage />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/no mood check-ins yet/i)).toBeInTheDocument();
  });
});
