"use client";

import { toast } from "sonner";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { useExportReport } from "@/hooks/api/accounting/reports";
import type { ReportKey } from "@/types/accounting/accounting-reports";

interface ExportReportButtonProps {
  report: ReportKey;
  params: Record<string, unknown>;
  filename: string;
  disabled?: boolean;
}

export function ExportReportButton({
  report,
  params,
  filename,
  disabled = false,
}: ExportReportButtonProps) {
  const canExport = useCan("accounting:reports:export");
  const exportReport = useExportReport();

  if (!canExport) return null;

  function handleExport() {
    exportReport.mutate(
      { report, params, filename },
      {
        onSuccess: () => toast.success("Report downloaded"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <AnimatedIconButton
      icon={DownloadIcon}
      iconSize={16}
      iconClassName="mr-1.5"
      size="sm"
      variant="outline"
      className="flex-1 sm:flex-none"
      onClick={handleExport}
      disabled={disabled || exportReport.isPending}
    >
      Export CSV
    </AnimatedIconButton>
  );
}
