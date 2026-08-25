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
  SOFTWARE: "bg-status-info-surface text-status-info-ink",
  ONBOARDING: "bg-status-info-surface text-status-info-ink",
  MARKETING: "bg-status-danger-surface text-status-danger-ink",
  SALES: "bg-status-success-surface text-status-success-ink",
  HR: "bg-status-warning-surface text-status-warning-ink",
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
  SOFTWARE: "bg-status-info-surface text-status-info-ink ring-status-info-rule",
  ONBOARDING: "bg-status-info-surface text-status-info-ink ring-status-info-rule",
  MARKETING: "bg-status-danger-surface text-status-danger-ink ring-status-danger-rule",
  SALES: "bg-status-success-surface text-status-success-ink ring-status-success-rule",
  HR: "bg-status-warning-surface text-status-warning-ink ring-status-warning-rule",
};

export const ticketTypeColors: Record<string, string> = {
  TASK: "bg-status-info-surface text-status-info-ink",
  STORY: "bg-status-success-surface text-status-success-ink",
  BUG: "bg-status-danger-surface text-status-danger-ink",
  EPIC: "bg-status-info-surface text-status-info-ink",
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
