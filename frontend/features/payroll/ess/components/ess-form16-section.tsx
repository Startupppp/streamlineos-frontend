"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { ErrorState } from "@/components/shared";
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
  const documents = data?.documents ?? [];

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <section id="form16" className="flex min-h-0 w-full flex-1 flex-col">
        <div className={PAGE_BODY_SKELETON_CLASS}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section id="form16" className="flex min-h-0 w-full flex-1 flex-col">
        <ErrorState
          className={PAGE_BODY_EMPTY_CLASS}
          title="Unable to load Form 16"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </section>
    );
  }

  if (documents.length === 0) {
    return (
      <section id="form16" className="flex min-h-0 w-full flex-1 flex-col">
        <EmptyState
          illustrationPreset="payroll"
          title="No Form 16 yet"
          description="Your Form 16 appears here once your employer releases it."
          className={PAGE_BODY_EMPTY_CLASS}
        />
      </section>
    );
  }

  return (
    <section id="form16" className="flex min-h-0 w-full flex-1 flex-col">
      <div className="min-h-0 w-full flex-1 overflow-y-auto rounded-xl border border-border bg-card">
        {documents.map((doc) => (
          <Form16DownloadRow
            key={doc.financialYear}
            financialYear={doc.financialYear}
            releasedAt={doc.releasedAt}
          />
        ))}
      </div>
    </section>
  );
}
