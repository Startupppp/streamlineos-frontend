export function formatCredits(credits: number): string {
  if (!Number.isFinite(credits)) return "0";
  const abs = Math.abs(credits);
  if (abs > 0 && abs < 0.001) return credits < 0 ? "> -0.001" : "< 0.001";
  const maximumFractionDigits = abs > 0 && abs < 0.01 ? 3 : 2;
  return credits.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export function formatTokens(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return "0";
  if (tokens < 1_000) return tokens.toLocaleString("en-US");
  if (tokens < 1_000_000) {
    const value = tokens / 1_000;
    return `${value >= 100 ? Math.round(value) : Number(value.toFixed(1))}K`;
  }
  const value = tokens / 1_000_000;
  return `${value >= 100 ? Math.round(value) : Number(value.toFixed(1))}M`;
}

export function formatUsd(costUsd: number): string {
  if (!Number.isFinite(costUsd)) return "$0.00";
  if (costUsd > 0 && costUsd < 0.01) return `$${costUsd.toFixed(4)}`;
  return `$${costUsd.toFixed(2)}`;
}
