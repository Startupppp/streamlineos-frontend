import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

const useCanState = jest.fn();
const useKbAnalyticsOverview = jest.fn();
const useKbNoResults = jest.fn();
const usePageAnalytics = jest.fn();
const useKnowledgeGaps = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: (key: string) => useCanState(key),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbAnalyticsOverview: () => useKbAnalyticsOverview(),
  useKbNoResults: () => useKbNoResults(),
  usePageAnalytics: () => usePageAnalytics(),
  useKnowledgeGaps: () => useKnowledgeGaps(),
  useCreateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
}));

import KnowledgeAnalyticsPage from "./knowledge-analytics-page";

function render(ui: ReactElement) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>);
}

const OVERVIEW = {
  totalCount: 12,
  publishedCount: 9,
  archivedCount: 1,
  totalViews: 340,
  helpfulUp: 7,
  helpfulDown: 1,
  helpfulRatio: 0.875,
  searches: 100,
  noResults: 15,
  searchSuccessRate: 0.85,
  aiAnswers: 4,
  aiNoContext: 1,
  views: 340,
  verifiedPublished: 5,
  trustScore: 0.55,
  topArticles: [],
};

function settled<T>(data: T) {
  return { data, isLoading: false, isError: false, error: null, refetch: jest.fn() };
}

function cancelled() {
  return { data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  useCanState.mockReturnValue("granted");
  useKbAnalyticsOverview.mockReturnValue(settled(OVERVIEW));
  useKbNoResults.mockReturnValue(settled([]));
  usePageAnalytics.mockReturnValue(settled([]));
  useKnowledgeGaps.mockReturnValue(settled([]));
});

describe("KnowledgeAnalyticsPage — access is three-valued, not a boolean", () => {
  it("shows the skeleton while the access snapshot is still in flight, never an access denial", () => {
    useCanState.mockReturnValue("loading");

    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText(/permission/i)).toBeNull();
    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("says denied only once the snapshot has actually said no", () => {
    useCanState.mockReturnValue("denied");

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText(/permission/i)).toBeInTheDocument();
  });
});

describe("KnowledgeAnalyticsPage — a read that never landed is not an empty page", () => {
  it("offers a retry instead of rendering a bare header when the overview was cancelled", () => {
    useKbAnalyticsOverview.mockReturnValue(cancelled());

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
  });

  it("does not claim the knowledge base is empty when the request was interrupted", () => {
    useKbAnalyticsOverview.mockReturnValue(cancelled());

    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText(/no page data yet/i)).toBeNull();
  });
});

describe("KnowledgeAnalyticsPage — a ratio is not a percentage", () => {
  it("renders a 0.85 success ratio as 85%, not as 1%", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.queryByText("1%")).toBeNull();
  });

  it("renders a zero ratio as 0%", () => {
    useKbAnalyticsOverview.mockReturnValue(
      settled({ ...OVERVIEW, searches: 0, searchSuccessRate: 0 }),
    );

    render(<KnowledgeAnalyticsPage />);

    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

describe("KnowledgeAnalyticsPage — a stat names what it actually counted", () => {
  it("does not label a help-centre article count as the wiki's page count", () => {
    render(<KnowledgeAnalyticsPage />);

    expect(screen.queryByText("Total pages")).toBeNull();
  });
});
