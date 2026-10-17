import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { EvidenceThemesSection } from "./evidence-themes-section";
import type { DiscoveryReviewsGetEvidenceThemesResponse } from "@/contracts/build-contracts.generated";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

jest.mock("@/features/build/shared/build-filter-select", () => ({
  BuildFilterSelect: ({ label, value, onValueChange, options }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    options: Array<{ label: string; value: string }>;
  }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="trend-chart">{children}</div>
  ),
  BarChart: ({ children, data }: { children: ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-count={data.length}>{children}</div>
  ),
  Bar: () => null,
}));

const WITH_SUGGESTIONS: DiscoveryReviewsGetEvidenceThemesResponse = {
  themes: [
    {
      theme: "Login performance",
      count: 12,
      latestAt: "2026-10-01T00:00:00Z",
      sentimentBreakdown: { positive: 2, neutral: 5, negative: 4, mixed: 1 },
      opportunityCount: 3,
      trend: [],
    },
  ],
  suggestedThemes: [
    { label: "Mobile checkout friction", count: 8, citations: [201, 202, 203, 204], suggestion: true },
    { label: "API rate limits", count: 5, citations: [301], suggestion: true },
  ],
};

const WITHOUT_SUGGESTIONS: DiscoveryReviewsGetEvidenceThemesResponse = {
  themes: [],
  suggestedThemes: [],
};

describe("EvidenceThemesSection — AI suggestions label (BSN-AI-SUGGESTIONS)", () => {
  it("labels the AI block as 'Suggestions' so the user knows the content is AI-generated and not a confirmed finding", () => {
    render(
      <EvidenceThemesSection
        managedProductId={1}
        themes={WITH_SUGGESTIONS.themes}
        suggestedThemes={WITH_SUGGESTIONS.suggestedThemes}
        period="30d"
        onPeriodChange={jest.fn()}
      />,
    );

    const badge = screen.getByText("Suggestions");
    expect(badge).toBeInTheDocument();

    expect(screen.getByTestId("ai-suggestions-label")).toHaveTextContent("AI suggestions");
  });

  it("renders citation links for each suggestion so evidence is traceable to source submissions", () => {
    render(
      <EvidenceThemesSection
        managedProductId={5}
        themes={WITH_SUGGESTIONS.themes}
        suggestedThemes={WITH_SUGGESTIONS.suggestedThemes}
        period="30d"
        onPeriodChange={jest.fn()}
      />,
    );

    const citations = screen.getAllByTestId("ai-suggestion-citation");
    expect(citations.length).toBeGreaterThan(0);

    expect(citations[0]).toHaveAttribute(
      "href",
      expect.stringContaining("submission=201"),
    );
    expect(citations[0]).toHaveAttribute(
      "href",
      expect.stringContaining("/build/managed-products/5/feedback"),
    );
  });

  it("does not render the AI suggestions block when there are no suggested themes", () => {
    render(
      <EvidenceThemesSection
        managedProductId={1}
        themes={WITHOUT_SUGGESTIONS.themes}
        suggestedThemes={WITHOUT_SUGGESTIONS.suggestedThemes}
        period="30d"
        onPeriodChange={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("ai-suggestions-label")).not.toBeInTheDocument();
  });
});

const TREND_UP = [
  { weekStart: "2026-09-01", count: 2 },
  { weekStart: "2026-09-08", count: 3 },
  { weekStart: "2026-09-15", count: 5 },
  { weekStart: "2026-09-22", count: 8 },
];

const TREND_DOWN = [
  { weekStart: "2026-09-01", count: 10 },
  { weekStart: "2026-09-08", count: 7 },
  { weekStart: "2026-09-15", count: 4 },
  { weekStart: "2026-09-22", count: 2 },
];

const TREND_STABLE = [
  { weekStart: "2026-09-01", count: 5 },
  { weekStart: "2026-09-08", count: 5 },
  { weekStart: "2026-09-15", count: 5 },
  { weekStart: "2026-09-22", count: 5 },
];

function makeTheme(trend: DiscoveryReviewsGetEvidenceThemesResponse["themes"][number]["trend"]): DiscoveryReviewsGetEvidenceThemesResponse["themes"][number] {
  return {
    theme: "Performance",
    count: 10,
    latestAt: null,
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0, mixed: 0 },
    opportunityCount: 1,
    trend,
  };
}

describe("EvidenceThemesSection — trend chart and text summary (BSN-TREND-SUMMARY)", () => {
  it("renders a recharts bar chart for a theme with at least one week of trend data", () => {
    render(
      <EvidenceThemesSection
        managedProductId={1}
        themes={[makeTheme(TREND_UP)]}
        suggestedThemes={[]}
        period="30d"
        onPeriodChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId("trend-chart")).toBeInTheDocument();
  });

  it('renders "Trending up" when the second half of the series exceeds the first half by more than 10%', () => {
    render(
      <EvidenceThemesSection
        managedProductId={1}
        themes={[makeTheme(TREND_UP)]}
        suggestedThemes={[]}
        period="30d"
        onPeriodChange={jest.fn()}
      />,
    );
    expect(screen.getByText("Trending up")).toBeInTheDocument();
  });

  it('renders "Trending down" when the second half of the series is more than 10% below the first half', () => {
    render(
      <EvidenceThemesSection
        managedProductId={1}
        themes={[makeTheme(TREND_DOWN)]}
        suggestedThemes={[]}
        period="30d"
        onPeriodChange={jest.fn()}
      />,
    );
    expect(screen.getByText("Trending down")).toBeInTheDocument();
  });

  it('renders "Stable" for a flat series so the user knows volume is not changing', () => {
    render(
      <EvidenceThemesSection
        managedProductId={1}
        themes={[makeTheme(TREND_STABLE)]}
        suggestedThemes={[]}
        period="30d"
        onPeriodChange={jest.fn()}
      />,
    );
    expect(screen.getByText("Stable")).toBeInTheDocument();
  });

  it("does not render a chart or summary when the theme has no trend data so the empty cell stays clean", () => {
    render(
      <EvidenceThemesSection
        managedProductId={1}
        themes={[makeTheme([])]}
        suggestedThemes={[]}
        period="30d"
        onPeriodChange={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("trend-chart")).not.toBeInTheDocument();
    expect(screen.queryByText("Trending up")).not.toBeInTheDocument();
    expect(screen.queryByText("Trending down")).not.toBeInTheDocument();
    expect(screen.queryByText("Stable")).not.toBeInTheDocument();
  });

  it("passes the last 8 weeks of data to the chart when the series is longer than 8 points", () => {
    const longTrend = Array.from({ length: 12 }, (_, i) => ({
      weekStart: `2026-${String(i + 1).padStart(2, "0")}-01`,
      count: i + 1,
    }));
    render(
      <EvidenceThemesSection
        managedProductId={1}
        themes={[makeTheme(longTrend)]}
        suggestedThemes={[]}
        period="30d"
        onPeriodChange={jest.fn()}
      />,
    );
    const barChart = screen.getByTestId("bar-chart");
    expect(barChart).toHaveAttribute("data-count", "8");
  });
});
