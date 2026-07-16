"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";

interface ProjectPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");

  pages.push(total);
  return pages;
}

export function ProjectPagination({ page, totalPages, onPageChange }: ProjectPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Projects pagination"
      className={cn(PM_PANEL, "flex shrink-0 items-center justify-center gap-0.5 px-2 py-1.5")}
    >
      <AnimatedIconButton
        variant="ghost"
        size="icon"
        className="w-7"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
        icon={ChevronLeftIcon}
        iconSize={14}
      />

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="select-none px-1 text-xs text-muted-foreground"
          >
            ...
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "ghost"}
            size="icon"
            className="w-7 text-xs"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </Button>
        ),
      )}

      <AnimatedIconButton
        variant="ghost"
        size="icon"
        className="w-7"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
        icon={ChevronRightIcon}
        iconSize={14}
      />
    </nav>
  );
}
