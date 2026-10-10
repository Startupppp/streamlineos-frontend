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
