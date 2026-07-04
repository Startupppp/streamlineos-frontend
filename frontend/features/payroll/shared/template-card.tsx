"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TemplateRow } from "@/types/payroll/setup";
import { COMPLEXITY_CONFIG } from "@/features/payroll/setup/lib/constants";

type TemplateCardProps = {
  template: TemplateRow;
  selected?: boolean;
  onSelect?: () => void;
  actions?: ReactNode;
};

export function TemplateCard({ template, selected, onSelect, actions }: TemplateCardProps) {
  const complexity = COMPLEXITY_CONFIG[template.complexity];
  const shownComponents = template.defaultComponents.slice(0, 4);
  const extraCount = template.defaultComponents.length - shownComponents.length;

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (onSelect && (e.key === "Enter" || e.key === " ")) onSelect();
  }

  function stopEvent(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative rounded-lg border p-4 text-left transition-all",
        onSelect && "cursor-pointer",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
      )}
    >
      {template.isRecommended && (
        <div className="absolute -top-2.5 left-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
            Recommended
          </span>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{template.name}</p>
            {template.badge && (
              <span className="inline-block mt-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {template.badge}
              </span>
            )}
          </div>
          <span className={cn("shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", complexity.className)}>
            {complexity.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">{template.bestFor}</p>

        <div className="flex flex-wrap gap-1">
          {shownComponents.map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
            >
              {c.name}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
              +{extraCount} more
            </span>
          )}
        </div>

        {actions && (
          <div
            className="flex items-center gap-2 pt-1"
            onClick={stopEvent}
            onKeyDown={stopEvent}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
