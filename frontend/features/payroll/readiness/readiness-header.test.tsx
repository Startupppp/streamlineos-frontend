import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ReadinessHeader } from "./readiness-header";
import type { CycleSummary } from "./readiness-summary";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

function summary(overrides: Partial<CycleSummary> = {}): CycleSummary {
  return {
    state: "blocked",
    headline: "This cycle is blocked.",
    ready: null,
    blockers: 3,
    blockedPeople: 0,
    waived: 0,
    isAllClear: false,
    ...overrides,
  };
}

function blockedTileText(): string {
  const label = screen
    .getAllByText("Blocked")
    .find((node) => node.className.includes("uppercase"));
  return label?.parentElement?.textContent ?? "";
}

describe("ReadinessHeader counts what the blockers table lists", () => {
  it("never reads zero while blockers exist that name no person", () => {
    render(
      <ReadinessHeader
        month="2026-09"
        summary={summary()}
        cutoff={null}
        updated={null}
        canStartRun={false}
        runId={null}
      />,
    );

    expect(blockedTileText()).toContain("Blocked3");
    expect(blockedTileText()).not.toMatch(/Blocked0(?!\d)/);
    expect(blockedTileText()).toContain("none named to a person");
  });

  it("says how many of the blockers name a person when any do", () => {
    render(
      <ReadinessHeader
        month="2026-09"
        summary={summary({ blockers: 4, blockedPeople: 2 })}
        cutoff={null}
        updated={null}
        canStartRun={false}
        runId={null}
      />,
    );

    expect(blockedTileText()).toContain("Blocked4");
    expect(blockedTileText()).toContain("2 named");
  });

  it("carries no detail line when the cycle has no blockers", () => {
    render(
      <ReadinessHeader
        month="2026-09"
        summary={summary({ state: "ready", blockers: 0, blockedPeople: 0, ready: 6, isAllClear: true })}
        cutoff={null}
        updated={null}
        canStartRun={false}
        runId={null}
      />,
    );

    expect(blockedTileText()).toBe("Blocked0");
  });
});
