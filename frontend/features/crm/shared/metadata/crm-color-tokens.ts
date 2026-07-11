import type { CrmColorToken } from "@/types/crm/metadata";

export interface CrmTokenClasses {
  badgeClass: string;
  dotClass: string;
  textClass: string;
  chartHex: string;
}

const TOKEN_MAP: Record<CrmColorToken, CrmTokenClasses> = {
  blue: {
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dotClass: "bg-blue-500",
    textClass: "text-blue-700 dark:text-blue-300",
    chartHex: "#3b82f6",
  },
  emerald: {
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-300",
    chartHex: "#10b981",
  },
  amber: {
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dotClass: "bg-amber-500",
    textClass: "text-amber-700 dark:text-amber-300",
    chartHex: "#f59e0b",
  },
  red: {
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    dotClass: "bg-red-500",
    textClass: "text-red-700 dark:text-red-300",
    chartHex: "#ef4444",
  },
  slate: {
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    textClass: "text-slate-700 dark:text-slate-300",
    chartHex: "#64748b",
  },
  cyan: {
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    dotClass: "bg-cyan-500",
    textClass: "text-cyan-700 dark:text-cyan-300",
    chartHex: "#06b6d4",
  },
  sky: {
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    dotClass: "bg-sky-500",
    textClass: "text-sky-700 dark:text-sky-300",
    chartHex: "#0ea5e9",
  },
  orange: {
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    dotClass: "bg-orange-500",
    textClass: "text-orange-700 dark:text-orange-300",
    chartHex: "#f97316",
  },
  pink: {
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800",
    dotClass: "bg-pink-500",
    textClass: "text-pink-700 dark:text-pink-300",
    chartHex: "#ec4899",
  },
  violet: {
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    dotClass: "bg-violet-500",
    textClass: "text-violet-700 dark:text-violet-300",
    chartHex: "#8b5cf6",
  },
};

const FALLBACK_TOKEN: CrmTokenClasses = {
  badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  dotClass: "bg-slate-400",
  textClass: "text-slate-700 dark:text-slate-300",
  chartHex: "#64748b",
};

export function getCrmTokenClasses(token: string): CrmTokenClasses {
  return TOKEN_MAP[token as CrmColorToken] ?? FALLBACK_TOKEN;
}
