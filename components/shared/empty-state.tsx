"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: { wrapper: "py-6", icon: "h-8 w-8", title: "text-sm", desc: "text-xs" },
  md: { wrapper: "py-10", icon: "h-12 w-12", title: "text-base", desc: "text-sm" },
  lg: { wrapper: "py-16", icon: "h-16 w-16", title: "text-lg", desc: "text-sm" },
} as const;

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        styles.wrapper,
        className,
      )}
    >
      {Icon && (
        <Icon className={cn("text-muted-foreground mb-3", styles.icon)} />
      )}
      <p className={cn("font-medium text-foreground", styles.title)}>{title}</p>
      {description && (
        <p className={cn("text-muted-foreground mt-1 max-w-sm", styles.desc)}>
          {description}
        </p>
      )}
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
