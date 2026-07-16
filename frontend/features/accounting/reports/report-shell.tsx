"use client";

import { type ReactNode } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { DownloadIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface ReportShellProps {
  title: string;
  subtitle?: string;
  filters?: ReactNode;
  exportPending?: boolean;
  onExport?: () => void;
  exportLabel?: string;
  children: ReactNode;
}

export function ReportShell({
  title,
  subtitle,
  filters,
  exportPending = false,
  onExport,
  exportLabel = "Export CSV",
  children,
}: ReportShellProps) {
  const canExport = useCan("accounting:reports:export");
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <PageWrapper
      backHref="/accounting/reports"
      title={title}
      subtitle={subtitle}
      filters={filters}
      actions={
        canExport && onExport ? (
          <LoadingButton
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            isPending={exportPending}
            loadingText="Exporting…"
            onClick={onExport}
            {...hoverHandlers}
          >
            <DownloadIcon ref={iconRef} className="h-3.5 w-3.5" />
            {exportLabel}
          </LoadingButton>
        ) : undefined
      }
    >
      {children}
    </PageWrapper>
  );
}
