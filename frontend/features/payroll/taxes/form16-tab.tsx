"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyReportIllustration } from "@/components/illustrations";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  currentFinancialYear,
  downloadForm16,
  recentFinancialYears,
  useForm16Documents,
  useReleaseAllForm16,
  useReleaseForm16,
  useUploadForm16,
} from "@/hooks/api/payroll/form16";
import type { Form16Row, Form16Status } from "@/hooks/api/payroll/form16-schema";

const STATUS_CLASS: Record<Form16Status, string> = {
  missing: "bg-muted text-muted-foreground border-border",
  uploaded: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  released: "bg-status-success-surface text-status-success-ink border-status-success-rule",
};

const STATUS_LABEL: Record<Form16Status, string> = {
  missing: "Missing",
  uploaded: "Uploaded",
  released: "Released",
};

interface RowActionsProps {
  row: Form16Row;
  financialYear: string;
  canManage: boolean;
  onPickFile: (membershipId: number) => void;
}

function Form16RowActions({ row, financialYear, canManage, onPickFile }: RowActionsProps) {
  const release = useReleaseForm16();
  const [downloading, setDownloading] = useState(false);

  function handlePick() {
    onPickFile(row.userMembershipId);
  }

  function handleRelease() {
    release.mutate(
      { financialYear, membershipId: row.userMembershipId },
      {
        onSuccess: () => toast.success("Form 16 released to the employee"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadForm16(financialYear, row.userMembershipId);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canManage ? (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handlePick}>
          {row.status === "missing" ? "Upload" : "Replace"}
        </Button>
      ) : null}
      {canManage && row.status === "uploaded" ? (
        <LoadingButton size="sm" className="h-7 text-xs" onClick={handleRelease} isPending={release.isPending} loadingText="Releasing…">
          Release
        </LoadingButton>
      ) : null}
      {row.status !== "missing" ? (
        <LoadingButton size="sm" variant="ghost" className="h-7 text-xs" onClick={handleDownload} isPending={downloading} loadingText="Downloading…">
          Download
        </LoadingButton>
      ) : null}
    </div>
  );
}

export function Form16Tab() {
  const canManage = useCan("payroll:tax:manage");
  const [financialYear, setFinancialYear] = useState(currentFinancialYear);
  const { data, isLoading, isError, error, refetch } = useForm16Documents(financialYear);
  const pageState = usePageState({ permission: "payroll:tax:view", isLoading, isError, error });
  const upload = useUploadForm16();
  const releaseAll = useReleaseAllForm16();
  const fileInput = useRef<HTMLInputElement>(null);
  const [targetMember, setTargetMember] = useState<number | null>(null);

  const rows = data?.rows ?? [];
  const uploadedCount = data?.counts.uploaded ?? 0;

  function handleRetry() {
    void refetch();
  }

  function handleYearChange(value: string) {
    setFinancialYear(value);
  }

  const handlePickFile = useCallback((membershipId: number) => {
    setTargetMember(membershipId);
    fileInput.current?.click();
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || targetMember == null) return;
    upload.mutate(
      { financialYear, membershipId: targetMember, file },
      {
        onSuccess: () => toast.success("Form 16 uploaded. Release it when you are ready."),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleReleaseAll() {
    releaseAll.mutate(financialYear, {
      onSuccess: (result) => toast.success(`${result.released} Form 16 released`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function getRowKey(row: Form16Row) {
    return row.userMembershipId;
  }

  const columns: DataTableColumn<Form16Row>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-dense font-medium">{row.employeeName ?? "Unnamed member"}</span>
          <span className="text-micro text-muted-foreground">{row.email ?? ""}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-dense font-medium ${STATUS_CLASS[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Form16RowActions row={row} financialYear={financialYear} canManage={canManage} onPickFile={handlePickFile} />
      ),
    },
  ];

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3 pt-3">
      <div className={FILTER_TOOLBAR_ROW}>
        <Select value={financialYear} onValueChange={handleYearChange}>
          <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-32`} aria-label="Financial year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {recentFinancialYears().map((fy) => (
              <SelectItem key={fy} value={fy}>
                FY {fy}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data ? (
          <span className="text-dense text-muted-foreground">
            {data.counts.missing} missing · {data.counts.uploaded} uploaded · {data.counts.released} released
          </span>
        ) : null}
        {canManage ? (
          <ConfirmDialog
            trigger={
              <Button size="sm" className="ml-auto text-xs" disabled={uploadedCount === 0}>
                Release all uploaded
              </Button>
            }
            title={`Release ${uploadedCount} Form 16 for FY ${financialYear}?`}
            description="Each employee can download their own Form 16 from My Pay once it is released."
            confirmLabel="Release"
            isPending={releaseAll.isPending}
            onConfirm={handleReleaseAll}
          />
        ) : null}
      </div>
      <p className="text-dense text-muted-foreground">
        Upload the Form 16 (Part A and B) you downloaded from TRACES, one PDF per employee. Employees see it in My Pay only after you release it.
      </p>
      <input ref={fileInput} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
      <PageState resolution={pageState} loading={<Skeleton className="h-64 rounded-lg" />} onRetry={handleRetry} className="flex-1">
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={columns}
          getRowKey={getRowKey}
          emptyState={
            <EmptyState
              illustration={<EmptyReportIllustration />}
              title={`No one was paid in FY ${financialYear}`}
              description="Employees with published payslips in this financial year appear here so you can upload their Form 16."
            />
          }
        />
      </PageState>
    </div>
  );
}
