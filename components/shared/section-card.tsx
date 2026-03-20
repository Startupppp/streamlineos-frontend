"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SectionCardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  isLoading,
  className,
}: SectionCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="relative p-4">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col gap-3 p-4 bg-card/80">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
