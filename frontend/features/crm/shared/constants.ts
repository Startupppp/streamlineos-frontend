import { Phone, Target, UserCheck, X, Zap, Eye } from "lucide-react";

export const PIPELINE_STAGES = [
  { key: "NEW", label: "New", dot: "bg-blue-500", bg: "bg-blue-500/10", color: "#3B82F6", icon: Zap },
  { key: "CONTACTED", label: "Contacted", dot: "bg-sky-500", bg: "bg-sky-500/10", color: "#0EA5E9", icon: Phone },
  { key: "INTERESTED", label: "Interested", dot: "bg-amber-500", bg: "bg-amber-500/10", color: "#F59E0B", icon: Eye },
  { key: "QUALIFIED", label: "Qualified", dot: "bg-purple-500", bg: "bg-purple-500/10", color: "#8B5CF6", icon: Target },
  { key: "CONVERTED", label: "Converted", dot: "bg-emerald-500", bg: "bg-emerald-500/10", color: "#10B981", icon: UserCheck },
  { key: "LOST", label: "Lost", dot: "bg-red-500", bg: "bg-red-500/10", color: "#EF4444", icon: X },
] as const;

export const DEAL_STAGES = [
  { key: "LEAD", label: "Lead", dot: "bg-blue-500", bg: "bg-blue-500/10" },
  { key: "CONTACTED", label: "Contacted", dot: "bg-sky-500", bg: "bg-sky-500/10" },
  { key: "PROPOSAL", label: "Proposal", dot: "bg-amber-500", bg: "bg-amber-500/10" },
  { key: "NEGOTIATION", label: "Negotiation", dot: "bg-purple-500", bg: "bg-purple-500/10" },
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
