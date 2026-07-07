export const categoryAccentBar: Record<string, string> = {
  GENERAL: "bg-slate-400",
  SOFTWARE: "bg-blue-500",
  ONBOARDING: "bg-violet-500",
  MARKETING: "bg-rose-500",
  SALES: "bg-emerald-500",
  HR: "bg-amber-500",
};

export const categoryBadgeColors: Record<string, string> = {
  GENERAL: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  SOFTWARE: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  ONBOARDING: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  MARKETING: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  SALES: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  HR: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export const categoryDotColors: Record<string, string> = {
  GENERAL: "bg-slate-400",
  SOFTWARE: "bg-blue-500",
  ONBOARDING: "bg-violet-500",
  MARKETING: "bg-rose-500",
  SALES: "bg-emerald-500",
  HR: "bg-amber-500",
};

export const categoryAvatarTints: Record<string, string> = {
  GENERAL: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-400",
  SOFTWARE: "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-400",
  ONBOARDING: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-400",
  MARKETING: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-400",
  SALES: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  HR: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
};

export const ticketTypeColors: Record<string, string> = {
  TASK: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  STORY: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  BUG: "bg-red-500/10 text-red-700 dark:text-red-400",
  EPIC: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
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
