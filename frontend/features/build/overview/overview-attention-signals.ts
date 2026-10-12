import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import type { StatusTone } from "@/lib/design-tokens";
import {
  CLOSED_OPPORTUNITY_STATES,
  HEALTH_PRESENTATION,
  hasStrategy,
  wholeDaysUntil,
} from "./overview-signals";

type SummaryProduct = ManagedProductSummary["product"];

const REVIEW_STALE_DAYS = 90;
const PROJECTION_STALE_HOURS = 6;
const PRE_LAUNCH_LIFECYCLES: ReadonlySet<SummaryProduct["lifecycle"]> = new Set(
  ["discovery", "build"],
);
const ATTENTION_TONE_RANK: Readonly<Record<StatusTone, number>> = {
  danger: 0,
  warning: 1,
  info: 2,
  neutral: 3,
  success: 4,
};

export interface AttentionSignal {
  id: string;
  tone: StatusTone;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  resolvedByReview?: boolean;
}

function launchSignal(
  product: SummaryProduct,
  base: string,
  now: Date,
): AttentionSignal | null {
  if (
    !product.targetLaunchDate ||
    !PRE_LAUNCH_LIFECYCLES.has(product.lifecycle)
  )
    return null;
  const days = wholeDaysUntil(product.targetLaunchDate, now);
  if (days === null || days >= 0) return null;
  return {
    id: "launch-overdue",
    tone: "danger",
    title: "Target launch has passed",
    detail: `Planned launch was ${Math.abs(days)} days ago and the product is still in ${product.lifecycle}.`,
    href: `${base}/settings`,
    actionLabel: "Update plan",
  };
}

function reviewSignal(
  product: SummaryProduct,
  base: string,
  now: Date,
): AttentionSignal | null {
  if (!product.lastReviewedAt) {
    return {
      id: "never-reviewed",
      tone: "info",
      title: "Product has never been reviewed",
      detail:
        "Record a review so the team knows this overview reflects reality.",
      href: `${base}/settings`,
      actionLabel: "Mark reviewed",
      resolvedByReview: true,
    };
  }
  const days = wholeDaysUntil(product.lastReviewedAt, now);
  if (days === null || -days <= REVIEW_STALE_DAYS) return null;
  return {
    id: "review-stale",
    tone: "warning",
    title: "Product review is overdue",
    detail: `Last reviewed ${-days} days ago. Products should be reviewed every ${REVIEW_STALE_DAYS} days.`,
    href: `${base}/settings`,
    actionLabel: "Mark reviewed",
    resolvedByReview: true,
  };
}

function releaseSignal(
  summary: ManagedProductSummary,
  base: string,
  now: Date,
): AttentionSignal | null {
  const release = summary.delivery.nextRelease;
  if (!release?.releaseDate) return null;
  const days = wholeDaysUntil(release.releaseDate, now);
  if (days === null || days >= 0) return null;
  return {
    id: "release-overdue",
    tone: "warning",
    title: `${release.name} ${release.version} is overdue`,
    detail: `It was due ${Math.abs(days)} days ago and has not been marked released.`,
    href: `${base}/releases`,
    actionLabel: "Open releases",
  };
}

function evidenceSignals(
  summary: ManagedProductSummary,
  base: string,
): AttentionSignal[] {
  const { evidence } = summary;
  const signals: AttentionSignal[] = [];
  if (evidence.feedbackCount === 0) {
    signals.push({
      id: "no-feedback",
      tone: "info",
      title: "No customer feedback captured",
      detail: "Decisions here have no evidence behind them yet.",
      href: `${base}/feedback`,
      actionLabel: "Capture feedback",
    });
  } else if (evidence.feedbackLast30d === 0) {
    signals.push({
      id: "feedback-quiet",
      tone: "warning",
      title: "No new feedback in 30 days",
      detail:
        "Evidence is going stale. Check that collection channels are still connected.",
      href: `${base}/feedback`,
      actionLabel: "Open feedback",
    });
  }
  const unthemed = evidence.feedbackCount - evidence.themedCount;
  if (unthemed > 0) {
    signals.push({
      id: "unthemed",
      tone: "info",
      title: `${unthemed} feedback ${unthemed === 1 ? "item is" : "items are"} not themed`,
      detail: "Untagged feedback never reaches an opportunity.",
      href: `${base}/feedback`,
      actionLabel: "Theme feedback",
    });
  }
  const unscored = summary.previews.opportunities.filter(
    (opportunity) =>
      opportunity.score === null &&
      !CLOSED_OPPORTUNITY_STATES.has(opportunity.state),
  ).length;
  if (unscored > 0) {
    signals.push({
      id: "unscored",
      tone: "info",
      title: `${unscored} top ${unscored === 1 ? "opportunity has" : "opportunities have"} no RICE score`,
      detail: "Score them so they can be compared and prioritised.",
      href: `${base}/insights`,
      actionLabel: "Score now",
    });
  }
  return signals;
}

function projectionFreshnessSignal(
  summary: ManagedProductSummary,
  base: string,
  now: Date,
): AttentionSignal | null {
  const generatedAt = summary.generatedAt;
  if (!generatedAt) return null;
  const ageMs = now.getTime() - new Date(generatedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < PROJECTION_STALE_HOURS) return null;
  return {
    id: "projection-stale",
    tone: "info",
    title: "Overview data may be stale",
    detail: `The last projection was computed ${Math.floor(ageHours)} hours ago. Some counts may not reflect the latest activity.`,
    href: `${base}/insights`,
    actionLabel: "Refresh insights",
  };
}

export function deriveAttentionSignals(
  summary: ManagedProductSummary,
  managedProductId: number,
  now: Date,
): AttentionSignal[] {
  const base = `/build/managed-products/${managedProductId}`;
  const { product, delivery, outcomes } = summary;
  const signals: AttentionSignal[] = [];
  if (product.health === "off_track" || product.health === "at_risk") {
    const presentation = HEALTH_PRESENTATION[product.health];
    signals.push({
      id: "health",
      tone: presentation.tone,
      title: `Health is ${presentation.label.toLowerCase()}`,
      detail: "Check the roadmap and delivery risks behind this rating.",
      href: `${base}/roadmap`,
      actionLabel: "Open roadmap",
    });
  }
  const launch = launchSignal(product, base, now);
  if (launch) signals.push(launch);
  const release = releaseSignal(summary, base, now);
  if (release) signals.push(release);
  if (!product.owner) {
    signals.push({
      id: "no-owner",
      tone: "warning",
      title: "No product owner",
      detail: "Nobody is accountable for decisions on this product.",
      href: `${base}/settings`,
      actionLabel: "Assign owner",
    });
  }
  if (!hasStrategy(product)) {
    signals.push({
      id: "no-strategy",
      tone: "info",
      title: "Strategy is not defined",
      detail:
        "Add a vision and north-star metric so trade-offs have a reference point.",
      href: `${base}/settings`,
      actionLabel: "Define strategy",
    });
  }
  const review = reviewSignal(product, base, now);
  if (review) signals.push(review);
  signals.push(...evidenceSignals(summary, base));
  const { scheduled, completed } = outcomes.outcomeReviews;
  if (delivery.roadmapCompleted > 0 && scheduled === 0 && completed === 0) {
    signals.push({
      id: "unmeasured",
      tone: "info",
      title: "Shipped work is not being measured",
      detail:
        "Schedule an outcome review to learn whether it moved the metric.",
      href: `${base}/insights`,
      actionLabel: "Schedule review",
    });
  }
  if (delivery.linkedProjects === 0) {
    signals.push({
      id: "no-projects",
      tone: "info",
      title: "No linked projects",
      detail: "Delivery progress counts will be zero until at least one project is linked.",
      href: `${base}/projects`,
      actionLabel: "Link projects",
    });
  }
  if (outcomes.goalsLinked === 0) {
    signals.push({
      id: "no-goals",
      tone: "info",
      title: "No linked goals",
      detail: "Outcome reviews can't run until this product is connected to a goal.",
      href: `${base}/goals`,
      actionLabel: "Link goals",
    });
  }
  const staleness = projectionFreshnessSignal(summary, base, now);
  if (staleness) signals.push(staleness);
  return signals.sort(
    (a, b) => ATTENTION_TONE_RANK[a.tone] - ATTENTION_TONE_RANK[b.tone],
  );
}
