export const categoryAccentBar: Record<string, string> = {
  GENERAL: "bg-category-slate-fill",
  SOFTWARE: "bg-category-blue-fill",
  ONBOARDING: "bg-category-cyan-fill",
  MARKETING: "bg-category-rose-fill",
  SALES: "bg-category-emerald-fill",
  HR: "bg-category-amber-fill",
};


export const categoryBadgeColors: Record<string, string> = {
  GENERAL: "bg-muted text-foreground",
  SOFTWARE: "bg-category-blue-surface text-category-blue-ink",
  ONBOARDING: "bg-category-cyan-surface text-category-cyan-ink",
  MARKETING: "bg-category-rose-surface text-category-rose-ink",
  SALES: "bg-category-emerald-surface text-category-emerald-ink",
  HR: "bg-category-amber-surface text-category-amber-ink",
};

export const categoryDotColors: Record<string, string> = {
  GENERAL: "bg-category-slate-fill",
  SOFTWARE: "bg-category-blue-fill",
  ONBOARDING: "bg-category-cyan-fill",
  MARKETING: "bg-category-rose-fill",
  SALES: "bg-category-emerald-fill",
  HR: "bg-category-amber-fill",
};

export const categoryAvatarTints: Record<string, string> = {
  GENERAL: "bg-muted text-foreground ring-border",
  SOFTWARE: "bg-category-blue-surface text-category-blue-ink ring-category-blue-rule",
  ONBOARDING: "bg-category-cyan-surface text-category-cyan-ink ring-category-cyan-rule",
  MARKETING: "bg-category-rose-surface text-category-rose-ink ring-category-rose-rule",
  SALES: "bg-category-emerald-surface text-category-emerald-ink ring-category-emerald-rule",
  HR: "bg-category-amber-surface text-category-amber-ink ring-category-amber-rule",
};


export const ticketTypeColors: Record<string, string> = {
  TASK: "bg-category-blue-surface text-category-blue-ink",
  STORY: "bg-category-emerald-surface text-category-emerald-ink",
  BUG: "bg-category-red-surface text-category-red-ink",
  EPIC: "bg-category-violet-surface text-category-violet-ink",
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
