"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPayroll } from "@/components/illustrations";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { downloadOwnForm16, useEssForm16 } from "@/hooks/api/payroll/form16";

interface Form16RowProps {
  financialYear: string;
  releasedAt: string | null;
}

function Form16DownloadRow({ financialYear, releasedAt }: Form16RowProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadOwnForm16(financialYear);
      toast.success(`Form 16 for FY ${financialYear} downloaded`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">Form 16 · FY {financialYear}</span>
          {releasedAt ? (
            <span className="text-micro text-muted-foreground">Released {formatShortDate(releasedAt)}</span>
          ) : null}
        </div>
      </div>
      <LoadingButton size="sm" variant="outline" onClick={handleDownload} isPending={downloading} loadingText="Downloading…">
        Download
      </LoadingButton>
    </div>
  );
}

export function EssForm16Section() {
  const { data, isLoading, isError, error, refetch } = useEssForm16();
  const pageState = usePageState({ permission: "self:payslips", isLoading, isError, error });
  const documents = data?.documents ?? [];

  function handleRetry() {
    void refetch();
  }

  return (
    <PageState resolution={pageState} loading={<Skeleton className="h-32 rounded-xl" />} onRetry={handleRetry} className="flex-1">
      {documents.length === 0 ? (
        <EmptyState
          illustration={<EmptyPayroll />}
          title="No Form 16 yet"
          description="Your Form 16 appears here once your employer releases it."
          compact
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          {documents.map((doc) => (
            <Form16DownloadRow key={doc.financialYear} financialYear={doc.financialYear} releasedAt={doc.releasedAt} />
          ))}
        </div>
      )}
    </PageState>
  );
}
