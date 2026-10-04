"use client";

import * as React from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";

interface PageShellProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  resolution?: PageStateResolution;
  dataUpdatedAt?: number;
}

function FreshnessLabel({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const [label, setLabel] = React.useState(() =>
    formatFreshness(dataUpdatedAt),
  );

  React.useEffect(() => {
    const interval = setInterval(
      () => setLabel(formatFreshness(dataUpdatedAt)),
      30_000,
    );
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  return (
    <span className="text-xs text-muted-foreground" aria-live="polite">
      {label}
    </span>
  );
}

function formatFreshness(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return "Updated just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Updated ${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `Updated ${diffHr}h ago`;
}

export function PageShell({
  title,
  actions,
  filterBar,
  children,
  className,
  resolution,
  dataUpdatedAt,
}: PageShellProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = contentRef.current?.querySelector<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    el?.focus();
  }, []);

  return (
    <PageWrapper
      title={title}
      actions={
        actions || dataUpdatedAt ? (
          <div className="flex items-center gap-3">
            {dataUpdatedAt ? (
              <FreshnessLabel dataUpdatedAt={dataUpdatedAt} />
            ) : null}
            {actions}
          </div>
        ) : undefined
      }
      filters={filterBar}
      state={resolution}
      className={className}
    >
      <div ref={contentRef} className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </PageWrapper>
  );
}
