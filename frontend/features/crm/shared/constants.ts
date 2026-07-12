export const DEAL_STAGES = [
  { key: "LEAD", label: "Lead", dot: "bg-blue-500", bg: "bg-blue-500/10" },
  { key: "CONTACTED", label: "Contacted", dot: "bg-sky-500", bg: "bg-sky-500/10" },
  { key: "PROPOSAL", label: "Proposal", dot: "bg-amber-500", bg: "bg-amber-500/10" },
  { key: "NEGOTIATION", label: "Negotiation", dot: "bg-blue-600", bg: "bg-blue-600/10" },
  { key: "WON", label: "Won", dot: "bg-emerald-500", bg: "bg-emerald-500/10" },
  { key: "LOST", label: "Lost", dot: "bg-red-500", bg: "bg-red-500/10" },
] as const;

export type DealStage = (typeof DEAL_STAGES)[number]["key"];

export const CHART_TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
} as const;

export const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;
