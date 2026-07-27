export const categoryAccentBar: Record<string, string> = {
  GENERAL: "bg-slate-400",
  SOFTWARE: "bg-blue-500",
  ONBOARDING: "bg-cyan-500",
  MARKETING: "bg-rose-500",
  SALES: "bg-emerald-500",
  HR: "bg-amber-500",
};

export const categoryBadgeColors: Record<string, string> = {
  GENERAL: "bg-slate-500/10 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  SOFTWARE: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  ONBOARDING: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
  MARKETING: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  SALES: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  HR: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
};

export const categoryDotColors: Record<string, string> = {
  GENERAL: "bg-slate-400",
  SOFTWARE: "bg-blue-500",
  ONBOARDING: "bg-cyan-500",
  MARKETING: "bg-rose-500",
  SALES: "bg-emerald-500",
  HR: "bg-amber-500",
};

export const categoryAvatarTints: Record<string, string> = {
  GENERAL: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300",
  SOFTWARE: "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300",
  ONBOARDING: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/20 dark:text-cyan-300",
  MARKETING: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
  SALES: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  HR: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
};

export const ticketTypeColors: Record<string, string> = {
  TASK: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  STORY: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  BUG: "bg-red-500/10 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  EPIC: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
};

const PREVIEW_LIMIT = 4;

export function getTemplateInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "TP";
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

export function getPreviewTickets<T>(tickets: T[]): { preview: T[]; overflow: number } {
  if (tickets.length <= PREVIEW_LIMIT) {
    return { preview: tickets, overflow: 0 };
  }
  return { preview: tickets.slice(0, PREVIEW_LIMIT), overflow: tickets.length - PREVIEW_LIMIT };
}
