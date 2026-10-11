import { render, screen } from "@testing-library/react";
import { OpportunitiesFilterBar } from "./opportunities-filter-bar";

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: jest.fn(() => false),
}));

const segmentOptions = [
  { value: "all", label: "All segments" },
  { value: "enterprise", label: "Enterprise" },
];
const ownerOptions = [
  { value: "all", label: "All owners" },
  { value: "7", label: "Ada" },
];

function renderBar() {
  return render(
    <OpportunitiesFilterBar
      stateFilter="declined"
      sortFilter="all"
      segmentFilter="all"
      ownerFilter="all"
      confidenceFilter="all"
      evidenceAgeFilter="all"
      scoreMinFilter="all"
      segmentOptions={segmentOptions}
      ownerOptions={ownerOptions}
      onStateChange={jest.fn()}
      onSortChange={jest.fn()}
      onSegmentChange={jest.fn()}
      onOwnerChange={jest.fn()}
      onConfidenceChange={jest.fn()}
      onEvidenceAgeChange={jest.fn()}
      onScoreMinChange={jest.fn()}
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
});
