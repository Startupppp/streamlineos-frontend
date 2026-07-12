"use client";

import { type ReactNode } from "react";
import { Download } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";

interface ReportShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  filters?: ReactNode;
  exportPending?: boolean;
  onExport?: () => void;
  exportLabel?: string;
  children: ReactNode;
}

export function ReportShell({
  eyebrow = "Finance · Reports",
  title,
  subtitle,
  filters,
  exportPending = false,
  onExport,
  exportLabel = "Export CSV",
  children,
}: ReportShellProps) {
  const canExport = useCan("accounting:reports:export");

  return (
    <PageWrapper
      eyebrow={eyebrow}
      backHref="/accounting/reports"
      title={title}
      subtitle={subtitle}
      filters={filters}
      actions={
        canExport && onExport ? (
          <LoadingButton
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            isPending={exportPending}
            loadingText="Exporting…"
            onClick={onExport}
          >
            <Download className="h-3.5 w-3.5" />
            {exportLabel}
          </LoadingButton>
        ) : undefined
      }
    >
      {children}
    </PageWrapper>
  );
}
