import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplatePickerCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

export function TemplatePickerCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: TemplatePickerCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex w-full min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-noir transition-colors",
        "hover:border-primary/40 hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-core transition-colors group-hover:bg-primary/15">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-dense text-muted-foreground text-pretty line-clamp-2">
          {description}
        </span>
      </span>
    </button>
  );
}
