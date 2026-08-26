import { StickyNote, ListTodo, Mail, Phone } from "lucide-react";

export const STATUS_PIPELINE = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

export type PipelineStatus = (typeof STATUS_PIPELINE)[number];

export const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  NEW:        { color: "text-white", bg: "bg-category-blue-fill border border-status-info-rule"    },
  CONTACTED:  { color: "text-white", bg: "bg-category-cyan-fill border border-status-info-rule"    },
  INTERESTED: { color: "text-white", bg: "bg-category-amber-fill border border-status-warning-rule"   },
  QUALIFIED:  { color: "text-white", bg: "bg-category-blue-fill border border-status-info-rule"  },
  CONVERTED:  { color: "text-white", bg: "bg-category-emerald-fill border border-status-success-rule" },
  LOST:       { color: "text-white", bg: "bg-category-rose-fill border border-status-danger-rule"    },
};

export const PRIORITY_STYLES: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  HOT:  { label: "Hot",  color: "text-white", bg: "bg-category-rose-fill border border-status-danger-rule"    },
  WARM: { label: "Warm", color: "text-white", bg: "bg-category-amber-fill border border-status-warning-rule" },
  COLD: { label: "Cold", color: "text-white", bg: "bg-category-blue-fill border border-status-info-rule"    },
};

export const TIMELINE_ICONS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  note: { icon: StickyNote, color: "bg-status-warning-surface text-status-warning-ink" },
  task: { icon: ListTodo, color: "bg-status-info-surface text-status-info-ink" },
  email: { icon: Mail, color: "bg-status-info-surface text-status-info-ink" },
  activity: { icon: Phone, color: "bg-status-success-surface text-status-success-ink" },
};

export type QuickAction = "call" | "email" | "note" | "task" | "draft" | null;

export function getScoreBadge(score: number | null | undefined) {
  const s = score ?? 0;
  if (s <= 30) return { label: "Low",    color: "text-white", bg: "bg-category-rose-fill border border-status-danger-rule"    };
  if (s <= 60) return { label: "Medium", color: "text-white", bg: "bg-category-amber-fill border border-status-warning-rule"   };
  return              { label: "Hot",    color: "text-white", bg: "bg-category-emerald-fill border border-status-success-rule" };
}

export function getSlaCountdown(deadline: Date | string | null | undefined) {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  if (diff <= 0)
    return { label: "Breached", color: "text-white bg-category-rose-fill border border-status-danger-rule" };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 4)
    return { label: `${hours}h ${mins}m left`, color: "text-white bg-category-amber-fill border border-status-warning-rule" };
  return   { label: `${hours}h ${mins}m left`, color: "text-white bg-category-emerald-fill border border-status-success-rule" };
}
