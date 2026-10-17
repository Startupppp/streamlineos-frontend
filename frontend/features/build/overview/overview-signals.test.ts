import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { OVERVIEW_SUMMARY } from "./managed-product-overview-test-fixtures";
import { deriveAttentionSignals } from "./overview-attention-signals";
import {
  countdownLabel,
  deriveValueStream,
  hasStrategy,
  openOpportunityCount,
  wholeDaysUntil,
} from "./overview-signals";

const NOW = new Date("2026-10-11T09:00:00Z");
const OWNER = { id: "u-1", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", image: null };

function healthySummary(): ManagedProductSummary {
  return {
    ...OVERVIEW_SUMMARY,
    product: {
      ...OVERVIEW_SUMMARY.product,
      owner: OWNER,
      vision: "Payments that never fail",
      lastReviewedAt: "2026-10-01T09:00:00Z",
    },
    evidence: { ...OVERVIEW_SUMMARY.evidence, themedCount: OVERVIEW_SUMMARY.evidence.feedbackCount },
  };
}

function signalIds(summary: ManagedProductSummary): string[] {
  return deriveAttentionSignals(summary, 42, NOW).map((signal) => signal.id);
}

describe("wholeDaysUntil and countdownLabel", () => {
  it("counts calendar days in both directions", () => {
    expect(wholeDaysUntil("2026-10-16T00:00:00Z", NOW)).toBe(5);
    expect(wholeDaysUntil("2026-10-09T23:00:00Z", NOW)).toBe(-2);
    expect(wholeDaysUntil("not a date", NOW)).toBeNull();
  });

  it("reads near days as words and far days as counts", () => {
    expect(countdownLabel(0)).toBe("Today");
    expect(countdownLabel(1)).toBe("Tomorrow");
    expect(countdownLabel(-1)).toBe("Yesterday");
    expect(countdownLabel(12)).toBe("In 12 days");
    expect(countdownLabel(-3)).toBe("3 days ago");
  });
});

describe("openOpportunityCount and hasStrategy", () => {
  it("excludes decided and archived opportunities", () => {
    expect(openOpportunityCount({ exploring: 2, accepted: 3, declined: 1, archived: 4, validating: 1 })).toBe(3);
  });

  it("treats success metrics alone as a defined strategy", () => {
    expect(hasStrategy(OVERVIEW_SUMMARY.product)).toBe(false);
    expect(hasStrategy({ ...OVERVIEW_SUMMARY.product, successMetrics: [{ label: "Activation" }] })).toBe(true);
  });
});

describe("deriveValueStream", () => {
  it("lists the six stages in delivery order with their counts and destinations", () => {
    const stages = deriveValueStream(OVERVIEW_SUMMARY, 42);
    expect(stages.map((stage) => [stage.id, stage.value])).toEqual([
      ["feedback", 12],
      ["themed", 6],
      ["opportunities", 2],
      ["roadmap", 19],
      ["shipped", 4],
      ["measured", 1],
    ]);
    expect(stages[1]?.hint).toBe("50% of feedback");
    expect(stages[5]?.hint).toBe("1 met · 0 missed");
    expect(stages[0]?.href).toBe("/build/managed-products/42/feedback");
  });
});

describe("deriveAttentionSignals", () => {
  it("raises nothing for a healthy, owned, reviewed and fully themed product", () => {
    expect(signalIds(healthySummary())).toEqual([]);
  });

  it("flags a missing owner, strategy, review and untagged feedback", () => {
    expect(signalIds(OVERVIEW_SUMMARY)).toEqual(["no-owner", "no-strategy", "never-reviewed", "unthemed"]);
  });

  it("orders danger before warning before info", () => {
    const summary: ManagedProductSummary = {
      ...OVERVIEW_SUMMARY,
      product: {
        ...OVERVIEW_SUMMARY.product,
        health: "off_track",
        lifecycle: "build",
        targetLaunchDate: "2026-09-01T00:00:00Z",
      },
    };
    const tones = deriveAttentionSignals(summary, 42, NOW).map((signal) => signal.tone);
    expect(tones.slice(0, 2)).toEqual(["danger", "danger"]);
    expect(tones.indexOf("warning")).toBeLessThan(tones.indexOf("info"));
  });

  it("flags a stale review, quiet feedback, an overdue release and unscored opportunities", () => {
    const base = healthySummary();
    const summary: ManagedProductSummary = {
      ...base,
      product: { ...base.product, lastReviewedAt: "2026-05-01T00:00:00Z" },
      evidence: { ...base.evidence, feedbackLast30d: 0 },
      delivery: {
        ...base.delivery,
        nextRelease: { id: 3, name: "Checkout", version: "2.1", releaseDate: "2026-10-01" },
      },
      previews: {
        ...base.previews,
        opportunities: [{ id: 9, title: "Retry", state: "exploring", score: null, scoreLabel: "unscored" }],
      },
    };
    expect(signalIds(summary).sort()).toEqual(
      ["feedback-quiet", "release-overdue", "review-stale", "unscored"].sort(),
    );
  });

  it("asks for an outcome review when work shipped and nothing is scheduled", () => {
    const base = healthySummary();
    const summary: ManagedProductSummary = {
      ...base,
      outcomes: { ...base.outcomes, outcomeReviews: { scheduled: 0, completed: 0, met: 0, notMet: 0 } },
    };
    const signal = deriveAttentionSignals(summary, 42, NOW).find((item) => item.id === "unmeasured");
    expect(signal?.href).toBe("/build/managed-products/42/insights");
  });

  it("routes every actionable signal to its owning product page", () => {
    const base = healthySummary();
    const summary: ManagedProductSummary = {
      ...base,
      product: {
        ...base.product,
        health: "off_track",
        lifecycle: "build",
        targetLaunchDate: "2026-09-01T00:00:00Z",
        owner: null,
        vision: null,
        successMetrics: [],
        lastReviewedAt: null,
      },
      evidence: { ...base.evidence, feedbackCount: 0, feedbackLast30d: 0, themedCount: 0 },
      delivery: {
        ...base.delivery,
        linkedProjects: 0,
        roadmapCompleted: 1,
        nextRelease: { id: 3, name: "Checkout", version: "2.1", releaseDate: "2026-10-01" },
      },
      outcomes: {
        ...base.outcomes,
        goalsLinked: 0,
        outcomeReviews: { scheduled: 0, completed: 0, met: 0, notMet: 0 },
      },
      generatedAt: "2026-10-10T00:00:00Z",
    };
    const destinations = Object.fromEntries(
      deriveAttentionSignals(summary, 42, NOW).map((signal) => [signal.id, signal.href]),
    );
    expect(destinations).toMatchObject({
      health: "/build/managed-products/42/roadmap",
      "launch-overdue": "/build/managed-products/42/settings",
      "release-overdue": "/build/managed-products/42/releases",
      "no-owner": "/build/managed-products/42/settings",
      "no-strategy": "/build/managed-products/42/settings",
      "never-reviewed": "/build/managed-products/42/settings",
      "no-feedback": "/build/managed-products/42/feedback",
      unmeasured: "/build/managed-products/42/insights",
      "no-projects": "/build/managed-products/42/projects",
      "no-goals": "/build/managed-products/42/goals",
      "projection-stale": "/build/managed-products/42/insights",
    });
  });
});
