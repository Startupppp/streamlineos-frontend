import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { HrPoll, PollResults } from "@/hooks/api/hr/engagement";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseEngagementOverview = jest.fn();
const mockUseOrgMoodAggregate = jest.fn();
const mockUseMyMoodHistory = jest.fn();
const mockUseEngagementPolls = jest.fn();
const mockUsePollResults = jest.fn();

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "hr:engagement:view": "all", "hr:engagement:manage": "all" }, modules: {} },
  isLoading: false,
};

function settledQuery<T>(data: T) {
  return { data, isLoading: false, isError: false, error: null, refetch: jest.fn() };
}

function idleMutation() {
  return { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };
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
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: (key: string) => mockUseCan(key),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/hr/engagement", () => ({
  useEngagementOverview: () => mockUseEngagementOverview(),
  useMyMoodHistory: () => mockUseMyMoodHistory(),
  useOrgMoodAggregate: () => mockUseOrgMoodAggregate(),
  useEngagementPolls: () => mockUseEngagementPolls(),
  usePollResults: (pollId: number) => mockUsePollResults(pollId),
  useCreatePoll: () => idleMutation(),
  useVotePoll: () => idleMutation(),
  useUpdatePoll: () => idleMutation(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: () => idleMutation(),
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
  MoodCheckinWidget: () => null,
}));

jest.mock("@/features/hr/engagement/recognition-feed", () => ({
  RecognitionFeed: () => null,
  BadgesGrid: () => null,
  PointsLeaderboard: () => null,
  GiveKudosSheet: () => null,
}));

jest.mock("@/features/hr/engagement/communities-tab", () => ({
  CommunitiesTab: () => null,
}));

jest.mock("@/features/hr/engagement/campaigns-tab", () => ({
  CampaignsTab: () => null,
}));

jest.mock("@/components/shared/hr-sheet", () => ({
  HrSheet: () => null,
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: () => undefined,
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/lib/query-keys/human-resources", () => ({
  humanResourcesQueryKeys: { hr: { hrRecognition: ["hr", "recognition"] } },
}));

import { HrEngagementPage } from "./engagement-page";
import { PollsTab } from "./polls-tab";
import { QuestionAnalyticsCard } from "@/features/surveys/results/question-analytics-card";

const MIN = 5;
const HIDDEN_MESSAGE = `Fewer than ${MIN} responses — hidden to protect anonymity`;

const ANONYMOUS_POLL: HrPoll = {
  id: 1,
  orgId: "org1",
  question: "Should we move stand-up to 10:00?",
  options: ["Yes", "No"],
  anonymous: true,
  status: "active",
  createdBy: "u1",
  createdByMembershipId: null,
  closesAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
};

function pollResults(overrides: Partial<PollResults>): PollResults {
  return {
    pollId: ANONYMOUS_POLL.id,
    question: ANONYMOUS_POLL.question,
    anonymous: true,
    status: "active",
    totalVotes: 3,
    minResponses: MIN,
    suppressed: true,
    counts: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseCan.mockReturnValue(true);
  mockUseEngagementOverview.mockReturnValue(settledQuery(undefined));
  mockUseMyMoodHistory.mockReturnValue(settledQuery(undefined));
  mockUseOrgMoodAggregate.mockReturnValue(settledQuery(undefined));
  mockUseEngagementPolls.mockReturnValue(settledQuery([ANONYMOUS_POLL]));
  mockUsePollResults.mockReturnValue(settledQuery(undefined));
});

describe("a suppressed anonymous result is explained, never drawn as an empty chart", () => {
  it("shows the hidden-for-anonymity notice with the vote progress for an anonymous poll under the minimum, and no bars", async () => {
    mockUsePollResults.mockImplementation((pollId: number) =>
      settledQuery(pollId === ANONYMOUS_POLL.id ? pollResults({}) : undefined),
    );

    render(<PollsTab />);
    await userEvent.setup().click(screen.getByRole("button", { name: /results/i }));

    expect(screen.getByRole("status")).toHaveTextContent(HIDDEN_MESSAGE);
    expect(screen.getByText(`3 of ${MIN} responses so far`)).toBeInTheDocument();
    expect(screen.queryByText(/total votes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\(\d+%\)/)).not.toBeInTheDocument();
  });

  it("draws the per-option bars once the poll is no longer suppressed", async () => {
    mockUsePollResults.mockImplementation((pollId: number) =>
      settledQuery(
        pollId === ANONYMOUS_POLL.id
          ? pollResults({
              totalVotes: MIN,
              suppressed: false,
              counts: [
                { option: "Yes", optionIndex: 0, count: 4 },
                { option: "No", optionIndex: 1, count: 1 },
              ],
            })
          : undefined,
      ),
    );

    render(<PollsTab />);
    await userEvent.setup().click(screen.getByRole("button", { name: /results/i }));

    expect(screen.getByText("4 (80%)")).toBeInTheDocument();
    expect(screen.getByText(`${MIN} total votes`)).toBeInTheDocument();
    expect(screen.queryByText(HIDDEN_MESSAGE)).not.toBeInTheDocument();
  });

  it("titles the HR surface Polls & engagement and explains a mood trend hidden on every day rather than calling it no data", () => {
    mockUseOrgMoodAggregate.mockReturnValue(settledQuery({ minResponses: MIN, suppressedDays: 3, points: [] }));

    render(<HrEngagementPage />);

    expect(screen.getByRole("heading", { name: "Polls & engagement" })).toBeInTheDocument();
    expect(screen.getByText(HIDDEN_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/no mood check-ins yet/i)).not.toBeInTheDocument();
  });

  it("says no mood check-ins yet only when nothing was hidden", () => {
    mockUseOrgMoodAggregate.mockReturnValue(settledQuery({ minResponses: MIN, suppressedDays: 0, points: [] }));

    render(<HrEngagementPage />);

    expect(screen.getByText(/no mood check-ins yet/i)).toBeInTheDocument();
    expect(screen.queryByText(HIDDEN_MESSAGE)).not.toBeInTheDocument();
  });

  it("hides a survey question's distribution and free text behind the same notice while the survey is suppressed", () => {
    render(
      <QuestionAnalyticsCard
        analytics={{
          questionId: 10,
          type: "long_text",
          title: "Anything else?",
          responseCount: 2,
          average: null,
          choiceDistribution: [],
          textResponses: undefined,
          minResponses: MIN,
          suppressed: true,
        }}
      />,
    );

    expect(screen.getByText(HIDDEN_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/no text responses yet/i)).not.toBeInTheDocument();
    expect(screen.getByText(/2 responses/)).toBeInTheDocument();
  });
});
