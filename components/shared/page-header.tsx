import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  sticky?: boolean;
  size?: "sm" | "md";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  className,
  sticky = false,
  size = "md",
}: PageHeaderProps) {
  const titleSize =
    size === "sm"
      ? "text-base lg:text-[1.05rem]"
      : "text-lg lg:text-xl";

  return (
    <div
      className={cn(
        "px-4 sm:px-6 pt-4 pb-3",
        sticky &&
          "sticky top-0 z-10 -mx-4 sm:-mx-6 bg-background/90 backdrop-blur-sm border-b border-border",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 mb-1 leading-none">
              {eyebrow}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={cn(
                "font-display font-bold tracking-[-0.015em] text-foreground leading-tight",
                titleSize,
              )}
            >
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-[13px] text-muted-foreground leading-snug max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
