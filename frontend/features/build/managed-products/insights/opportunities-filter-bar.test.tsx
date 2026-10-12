import { render, screen } from "@testing-library/react";
import { OpportunitiesFilterBar } from "./opportunities-filter-bar";

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: jest.fn(() => false),
}));

const segmentOptions = [
  { value: "enterprise", label: "Enterprise" },
];
const ownerOptions = [
  { value: "7", label: "Ada" },
];
const themeOptions = [
  { value: "Performance", label: "Performance" },
  { value: "Reliability", label: "Reliability" },
];

function renderBar(overrides: Partial<React.ComponentProps<typeof OpportunitiesFilterBar>> = {}) {
  return render(
    <OpportunitiesFilterBar
      stateValues={["declined"]}
      sortFilter="all"
      segmentValues={[]}
      ownerValues={[]}
      confidenceValues={[]}
      evidenceAgeFilter="all"
      scoreMinFilter="all"
      segmentOptions={segmentOptions}
      ownerOptions={ownerOptions}
      onStateValuesChange={jest.fn()}
      onSortChange={jest.fn()}
      onSegmentValuesChange={jest.fn()}
      onOwnerValuesChange={jest.fn()}
      onConfidenceValuesChange={jest.fn()}
      onEvidenceAgeChange={jest.fn()}
      onScoreMinChange={jest.fn()}
      {...overrides}
    />,
  );
}

describe("OpportunitiesFilterBar", () => {
  it("shows four filters on desktop, three on tablet, and two on mobile", () => {
    const { container } = renderBar();
    expect(container.querySelector("[data-filter-id=oppState]")?.className).toContain(
      "max-md:flex-1",
    );
    expect(container.querySelector("[data-filter-id=oppSort]")?.className).not.toMatch(
      /(?:^|\s)(?:max-(?:md|lg):)?hidden(?:\s|$)/,
    );
    expect(container.querySelector("[data-filter-id=oppSegment]")?.className).toContain(
      "max-md:hidden",
    );
    expect(container.querySelector("[data-filter-id=oppOwner]")?.className).toContain(
      "max-lg:hidden",
    );
    expect(container.querySelector("[data-filter-id=oppConfidence]")?.className.split(/\s+/)).toContain(
      "hidden",
    );
    expect(container.querySelector("[data-filter-id=oppState]")?.className).toContain(
      "md:flex-1",
    );
    expect(container.querySelector("[data-filter-id=oppState]")?.className).not.toContain(
      "md:max-w-40",
    );
    expect(screen.getByRole("button", { name: /^Filters/ })).toHaveClass("inline-flex");
  });

  it("does not render the theme filter when themeOptions is absent so the bar stays clean with no themes loaded", () => {
    const { container } = renderBar();
    expect(container.querySelector("[data-filter-id=oppTheme]")).toBeNull();
  });

  it("does not render the theme filter when onThemeValuesChange is absent even if themeOptions is provided", () => {
    const { container } = renderBar({
      themeValues: [],
      themeOptions,
    });
    expect(container.querySelector("[data-filter-id=oppTheme]")).toBeNull();
  });

  it("renders the theme filter when themeOptions has at least one entry and onThemeValuesChange is provided", () => {
    const { container } = renderBar({
      themeValues: [],
      themeOptions,
      onThemeValuesChange: jest.fn(),
    });
    expect(container.querySelector("[data-filter-id=oppTheme]")).not.toBeNull();
  });

  it("marks theme filter active when themeValues has a selected value", () => {
    const { container } = renderBar({
      themeValues: ["Performance"],
      themeOptions,
      onThemeValuesChange: jest.fn(),
    });
    const themeCell = container.querySelector("[data-filter-id=oppTheme]");
    expect(themeCell?.getAttribute("data-active")).toBe("true");
  });

  it("does not render the scoreMax filter when onScoreMaxChange is absent", () => {
    const { container } = renderBar();
    expect(container.querySelector("[data-filter-id=oppScoreMax]")).toBeNull();
  });

  it("renders the scoreMax filter when onScoreMaxChange is provided", () => {
    const { container } = renderBar({
      scoreMaxFilter: "all",
      onScoreMaxChange: jest.fn(),
    });
    expect(container.querySelector("[data-filter-id=oppScoreMax]")).not.toBeNull();
  });

  it("marks scoreMax filter active when scoreMaxFilter is a non-all value", () => {
    const { container } = renderBar({
      scoreMaxFilter: "100",
      onScoreMaxChange: jest.fn(),
    });
    const maxCell = container.querySelector("[data-filter-id=oppScoreMax]");
    expect(maxCell?.getAttribute("data-active")).toBe("true");
  });

  it("shows both scoreMin and scoreMax filters together when both are provided", () => {
    const { container } = renderBar({
      scoreMinFilter: "25",
      scoreMaxFilter: "100",
      onScoreMaxChange: jest.fn(),
    });
    expect(container.querySelector("[data-filter-id=oppScoreMin]")).not.toBeNull();
    expect(container.querySelector("[data-filter-id=oppScoreMax]")).not.toBeNull();
  });
});
