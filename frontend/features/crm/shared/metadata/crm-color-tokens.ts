import type { CrmColorToken } from "@/types/crm/metadata";

export interface CrmTokenClasses {
  badgeClass: string;
  dotClass: string;
  textClass: string;
  chartHex: string;
}

const TOKEN_MAP: Record<CrmColorToken, CrmTokenClasses> = {
  blue: {
    badgeClass: "bg-category-blue-surface text-category-blue-ink border-category-blue-rule",
    dotClass: "bg-category-blue-fill",
    textClass: "text-category-blue-ink",
    chartHex: "#3b82f6",
  },
  emerald: {
    badgeClass: "bg-category-emerald-surface text-category-emerald-ink border-category-emerald-rule",
    dotClass: "bg-category-emerald-fill",
    textClass: "text-category-emerald-ink",
    chartHex: "#10b981",
  },
  amber: {
    badgeClass: "bg-category-amber-surface text-category-amber-ink border-category-amber-rule",
    dotClass: "bg-category-amber-fill",
    textClass: "text-category-amber-ink",
    chartHex: "#f59e0b",
  },
  red: {
    badgeClass: "bg-category-rose-surface text-category-rose-ink border-category-rose-rule",
    dotClass: "bg-category-rose-fill",
    textClass: "text-category-rose-ink",
    chartHex: "#ef4444",
  },
  slate: {
    badgeClass: "bg-category-slate-surface text-category-slate-ink border-category-slate-rule",
    dotClass: "bg-category-slate-fill",
    textClass: "text-category-slate-ink",
    chartHex: "#64748b",
  },
  cyan: {
    badgeClass: "bg-category-cyan-surface text-category-cyan-ink border-category-cyan-rule",
    dotClass: "bg-category-cyan-fill",
    textClass: "text-category-cyan-ink",
    chartHex: "#06b6d4",
  },
  sky: {
    badgeClass: "bg-category-blue-surface text-category-blue-ink border-category-blue-rule",
    dotClass: "bg-category-blue-fill",
    textClass: "text-category-blue-ink",
    chartHex: "#0ea5e9",
  },
  orange: {
    badgeClass: "bg-category-amber-surface text-category-amber-ink border-category-amber-rule",
    dotClass: "bg-category-amber-fill",
    textClass: "text-category-amber-ink",
    chartHex: "#f97316",
  },
  pink: {
    badgeClass: "bg-category-pink-surface text-category-pink-ink border-category-pink-rule",
    dotClass: "bg-category-pink-fill",
    textClass: "text-category-pink-ink",
    chartHex: "#ec4899",
  },
  violet: {
    badgeClass: "bg-category-violet-surface text-category-violet-ink border-category-violet-rule",
    dotClass: "bg-category-violet-fill",
    textClass: "text-category-violet-ink",
    chartHex: "#8b5cf6",
  },
};

const FALLBACK_TOKEN: CrmTokenClasses = {
  badgeClass: "bg-category-slate-surface text-category-slate-ink border-category-slate-rule",
  dotClass: "bg-category-slate-fill",
  textClass: "text-category-slate-ink",
  chartHex: "#64748b",
};

export function getCrmTokenClasses(token: string): CrmTokenClasses {
  return TOKEN_MAP[token as CrmColorToken] ?? FALLBACK_TOKEN;
}
