interface RiceInputs {
  reach: string;
  impact: number;
  confidence: number;
  effort: number;
}

export function computeRiceScore(inputs: RiceInputs): number | null {
  const reachNum = Number(inputs.reach);
  if (inputs.reach.trim() === "" || !Number.isFinite(reachNum) || reachNum <= 0) return null;
  if (!Number.isFinite(inputs.impact) || inputs.impact <= 0) return null;
  if (!Number.isFinite(inputs.confidence) || inputs.confidence < 0 || inputs.confidence > 1) return null;
  if (!Number.isFinite(inputs.effort) || inputs.effort <= 0) return null;
  return (reachNum * inputs.impact * inputs.confidence) / inputs.effort;
}

export function formatRiceScore(score: number | null): string {
  if (score === null) return "Unscored";
  return score.toFixed(2);
}
