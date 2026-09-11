"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues, type RecordValue } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  NURTURE_SEQUENCE_LAYOUT,
  nurtureSequenceRecordFields,
} from "@/lib/renderer/crm/nurture-layout";
import { useCan, useCanState } from "@/hooks/api/access";
import { useNurtureSequences } from "@/hooks/api/crm/nurture";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  NURTURE_SEQUENCE_STATUSES,
  NURTURE_SEQUENCE_STATUS_LABELS,
  type NurtureSequenceStatus,
} from "@/types/crm/nurture";
import { CreateNurtureSequenceDialog } from "./create-nurture-sequence-dialog";

const ALL = "all";

function isSequenceStatus(value: string | null): value is NurtureSequenceStatus {
  return value !== null && NURTURE_SEQUENCE_STATUSES.some((status) => status === value);
}

/**
 * Every cadence the organisation authors, and the way into one.
 *
 * Lifecycle lives on the record rather than here on purpose: pausing a sequence
 * stops the enrolments already inside it, not just new ones, so it is a decision
 * to take while looking at who is in it. `NURTURE_SEQUENCE_LAYOUT` says the same
 * thing by declaring `status` read-only.
 *
 * No table is written here. The columns, the status badge's tone, the
 * description under the name and the mobile card all come from the description;
 * what is left is the status filter, which is a query rather than a column, and
 * the cursor the "show older" control advances.
 */
export function NurtureSequencesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const viewState = useCanState("crm:autonomy:view");
  const canManage = useCan("crm:autonomy:manage");
  const [createOpen, setCreateOpen] = useState(false);

  const layout = useTenantLayout(NURTURE_SEQUENCE_LAYOUT);

  const statusParam = searchParams.get("status");
  const status = isSequenceStatus(statusParam) ? statusParam : undefined;

  const sequences = useNurtureSequences(status ? { status } : {});
  const rows = useMemo(
    () =>
      asRecordValues(
        (sequences.data?.pages ?? [])
          .flatMap((page) => page.data)
          .map(nurtureSequenceRecordFields),
      ),
    [sequences.data?.pages],
  );

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete("status");
    else params.set("status", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleOpen = useCallback(
    (row: RecordValue) => router.push(`/crm/autonomy/nurture/${String(row.nurtureSequenceId)}`),
    [router],
  );

  const handleCreate = useCallback(() => setCreateOpen(true), []);

  if (viewState === "denied")
    return (
      <PageWrapper title="Nurture sequences">
        <NoPermissionState
          permission="crm:autonomy:view"
          description="You don’t have permission to read the nurture cadences."
        />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Nurture sequences"
      subtitle="Cadences that decide when to consider writing to a customer again."
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleCreate}
          >
            New sequence
          </AnimatedIconButton>
        ) : null
      }
      filters={
        <Select value={status ?? ALL} onValueChange={handleStatusChange}>
          <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {NURTURE_SEQUENCE_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {NURTURE_SEQUENCE_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {sequences.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn’t load the sequences"
          description={getErrorMessage(sequences.error)}
          onRetry={() => void sequences.refetch()}
        />
      ) : sequences.isLoading || viewState === "loading" ? (
        /*
          The gate's own pending state belongs here too: the read is disabled
          until rights arrive, and a disabled query reports `isLoading: false`,
          so without this the first paint says there are no sequences.
        */
        <DataTableSkeleton
          rows={10}
          columns={layout.list.columns.length}
          className="flex-1 min-h-0"
        />
      ) : (
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={(row) => String(row.nurtureSequenceId)}
          onRowClick={handleOpen}
          isLoading={false}
          className="flex-1 min-h-0"
          minWidth="720px"
          pagination={{ pageSize: 25 }}
          footer={
            sequences.hasNextPage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sequences.isFetchingNextPage}
                onClick={() => void sequences.fetchNextPage()}
              >
                Show older sequences
              </Button>
            ) : undefined
          }
          emptyState={
            <EmptyState
              access={sequences.access}
              className="min-h-[40vh] border-0 bg-transparent"
              illustrationPreset="report"
              title={status ? "Nothing with that status" : "No nurture sequences yet"}
              description={
                status
                  ? "No sequence is in that state right now."
                  : "A sequence decides how long to leave a customer alone before considering the next message. Nothing sends until one is turned on."
              }
              {...(canManage && !status
                ? { action: { label: "New sequence", onClick: handleCreate } }
                : {})}
            />
          }
        />
      )}

      <CreateNurtureSequenceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(nurtureSequenceId) =>
          router.push(`/crm/autonomy/nurture/${nurtureSequenceId}`)
        }
      />
    </PageWrapper>
  );
}
