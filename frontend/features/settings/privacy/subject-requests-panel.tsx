"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { PageState } from "@/components/shared/page-state";
import { RecordList } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useExecuteSubjectRequest, useSubjectRequests } from "@/hooks/api/privacy/subject-requests";
import type { ExecuteSubjectRequestResult, FiledSubjectRequest } from "@/hooks/api/privacy/subject-requests-schema";
import { downloadBlob } from "@/lib/download-blob";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { SUBJECT_REQUEST_LAYOUT } from "@/lib/renderer/settings/subject-request-layout";
import { SubjectRequestDialog } from "./subject-request-dialog";
import { readSubjectFilter, toExecutePayload, type SubjectRequestValues } from "./subject-request-schema";
import { TypedEmailConfirmDialog } from "./typed-email-confirm-dialog";

const HEADERS = ["Request", "Subject", "Status", "Records", "Requested", "Due"];
const CELLS = {
  dueBy: (row: FiledSubjectRequest) => (row.dueBy ? formatShortDate(row.dueBy) : "—"),
};

function rowKey(row: FiledSubjectRequest): string {
  return row.subjectRequestId;
}

function summarise(result: ExecuteSubjectRequestResult): string {
  const verb = result.result.kind === "erasure" ? "Erased" : "Exported";
  return result.mayReportComplete
    ? `${verb} ${result.result.totalRecordsAffected} records for ${result.result.subjectEmail}`
    : `Filed as incomplete: ${result.failureSummary ?? "a region did not report success"}`;
}

export function SubjectRequestsPanel() {
  const layout = useTenantLayout(SUBJECT_REQUEST_LAYOUT);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSubject = searchParams.get("subject") ?? "";
  const [search, setSearch] = useState(urlSubject);
  const debounced = useDebouncedValue(search, 300);
  const subject = readSubjectFilter(debounced);

  const canExecute = useCan("compliance:subject-requests:execute");
  const query = useSubjectRequests(subject);
  const execute = useExecuteSubjectRequest();
  const [formOpen, setFormOpen] = useState(false);
  const [pendingErasure, setPendingErasure] = useState<SubjectRequestValues | null>(null);
  const rows = useMemo(() => query.data?.data ?? [], [query.data]);

  const pageState = usePageState({
    permission: "compliance:subject-requests:view",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: query.isSuccess && rows.length === 0,
    hasActiveFilters: subject !== undefined,
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) params.set("subject", value.trim());
    else params.delete("subject");
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  function handleClearFilters() {
    handleSearchChange("");
  }

  function handleRetry() {
    void query.refetch();
  }

  function handleOpenForm() {
    setFormOpen(true);
  }

  function run(values: SubjectRequestValues) {
    execute.mutate(toExecutePayload(values), {
      onSuccess: (result) => {
        if (result.mayReportComplete) toast.success(summarise(result));
        else toast.warning(summarise(result));
        if (result.result.kind === "export" && result.data !== undefined) {
          const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
          downloadBlob(blob, `subject-request-${result.subjectRequestId}.json`);
        }
        setFormOpen(false);
        setPendingErasure(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleSubmit(values: SubjectRequestValues) {
    if (values.kind === "erasure") {
      setFormOpen(false);
      setPendingErasure(values);
      return;
    }
    run(values);
  }

  function handleErasureOpenChange(open: boolean) {
    if (!open) setPendingErasure(null);
  }

  function handleConfirmErasure() {
    if (pendingErasure) run(pendingErasure);
  }

  const emptyState = (
    <EmptyState
      illustrationPreset="activity"
      title="No subject requests filed"
      description="Access and erasure requests run here are filed with their outcome, so you can show what was done and when."
      filtersActive={subject !== undefined}
      onClearFilters={handleClearFilters}
      action={canExecute ? { label: "Run a request", onClick: handleOpenForm } : undefined}
      className="flex-1 min-h-[40vh]"
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Filter by exact email…"
          value={search}
          onValueChange={handleSearchChange}
          className="w-full sm:max-w-sm"
        />
        {canExecute ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            onClick={handleOpenForm}
          >
            Run a request
          </AnimatedIconButton>
        ) : null}
      </div>

      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton fill headers={HEADERS} />}
        empty={emptyState}
        onClearFilters={handleClearFilters}
        onRetry={handleRetry}
        className="flex min-h-0 flex-1 flex-col"
      >
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={rowKey}
          cells={CELLS}
          emptyState={emptyState}
          minWidth="720px"
          className="flex min-h-0 flex-1 flex-col"
          pagination={{ pageSize: 20 }}
        />
      </PageState>

      <SubjectRequestDialog open={formOpen} onOpenChange={setFormOpen} isSubmitting={execute.isPending} onSubmit={handleSubmit} />
      {pendingErasure ? (
        <TypedEmailConfirmDialog
          open
          onOpenChange={handleErasureOpenChange}
          title="Erase this subject's data everywhere?"
          description="Every region deletes the rows declared erasable for this email. Backups age out on their own schedule. This cannot be undone."
          email={pendingErasure.subjectEmail}
          confirmLabel="Erase permanently"
          isPending={execute.isPending}
          onConfirm={handleConfirmErasure}
        />
      ) : null}
    </div>
  );
}
