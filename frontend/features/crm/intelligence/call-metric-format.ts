/**
 * Basis points rendered for a person, in one place.
 *
 * The backend counts every ratio in basis points of 10000 and never sends a
 * percentage, because the division happens once, where the words are counted.
 * The consequence is that every surface showing one of these numbers has to
 * divide by a hundred, and the moment two of them do it inline they start
 * disagreeing about rounding — a rep's talk ratio reading 62% on their own page
 * and 61.5% on the call is a bug report nobody can reproduce.
 *
 * Null is rendered as an em dash and never as zero. A missing talk ratio means
 * the transcript carried no speaker attribution; printing 0% would report a rep
 * as having said nothing, which is the exact fabrication `transcript-metrics.ts`
 * refuses to make on the way in.
 */

/** The em dash every unknown metric renders as. One character, one meaning. */
export const METRIC_UNKNOWN = "—";

/** A ratio as a whole percentage. `4100` becomes `41%`. */
export function formatBpsPercent(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return METRIC_UNKNOWN;
  return `${Math.round(bps / 100)}%`;
}

/**
 * A question rate, which can legitimately exceed one per turn.
 *
 * Shown as questions per ten turns rather than as a percentage, because "38%"
 * for a rate is a category error a reader has to translate every time, and
 * because a rate above 10000 bps renders as "120%" — a percentage nobody can
 * interpret. One decimal, because rounding 0.4 and 1.4 to the same integer
 * flattens the distinction the metric exists to show.
 */
export function formatQuestionsPerTenTurns(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return METRIC_UNKNOWN;
  return (bps / 1000).toFixed(1);
}
