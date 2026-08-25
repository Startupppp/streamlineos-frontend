const PALETTE = [
  { bg: "bg-status-info-surface", border: "border-status-info-rule", text: "text-status-info-ink", solid: "bg-category-blue-fill" },
  { bg: "bg-status-success-surface", border: "border-status-success-rule", text: "text-status-success-ink", solid: "bg-category-emerald-fill" },
  { bg: "bg-status-warning-surface", border: "border-status-warning-rule", text: "text-status-warning-ink", solid: "bg-category-amber-fill" },
  { bg: "bg-category-violet-surface", border: "border-category-violet-rule", text: "text-category-violet-ink", solid: "bg-category-violet-fill" },
  { bg: "bg-status-danger-surface", border: "border-status-danger-rule", text: "text-status-danger-ink", solid: "bg-category-rose-fill" },
  { bg: "bg-status-info-surface", border: "border-status-info-rule", text: "text-status-info-ink", solid: "bg-category-cyan-fill" },
];

export function recipientColor(index: number) {
  return PALETTE[index % PALETTE.length];
}
