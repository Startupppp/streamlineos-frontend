import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BuildPaginatedContentProps {
  children: ReactNode;
  footer: ReactNode;
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
}

export function BuildPaginatedContent({
  children,
  footer,
  ariaLabel,
  className,
  contentClassName,
  footerClassName,
}: BuildPaginatedContentProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      <div
        role={ariaLabel ? "region" : undefined}
        aria-label={ariaLabel}
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain",
          contentClassName,
        )}
      >
        {children}
      </div>
      {footer != null ? (
        <div
          className={cn(
            "shrink-0 max-md:[.mobile-nav-active_&]:pb-[env(safe-area-inset-bottom,0px)]",
            footerClassName,
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
