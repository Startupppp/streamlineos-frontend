"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { AutomationsIllustration } from "@/components/illustrations";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { SequenceSheet } from "@/features/crm/settings/sequences/sequence-sheet";
import { useCan } from "@/hooks/api/access";
import { useCrmSequences, useDeleteCrmSequence, useUpdateCrmSequence } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { SEQUENCE_LAYOUT } from "@/lib/renderer/crm/settings/sequence-layout";
import type { CrmSequence } from "@/types/crm";

/**
 * Sequences.
 *
 * Opening a row opens the sequence — its details, its steps and who is enrolled
 * — because that is what somebody came here to do. Pausing one stays a switch in
 * the row: one field on a record already on screen needs no overlay at all.
 */
export default function SequencesPage() {
  const layout = useTenantLayout(SEQUENCE_LAYOUT);
  const [density, setDensity] = useDensity();
  const canManage = useCan("crm:sequences:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [openTarget, setOpenTarget] = useState<CrmSequence | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmSequence | null>(null);

  const { data, isLoading, isError, refetch } = useCrmSequences();
  const updateSequence = useUpdateCrmSequence();
  const deleteSequence = useDeleteCrmSequence();

  const sequences = useMemo(() => data?.sequences ?? [], [data]);

  const handleOpenCreate = useCallback(() => {
    setOpenTarget(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setOpenTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleToggleActive = useCallback(
    (sequence: CrmSequence) => {
      updateSequence.mutate(
        { id: sequence.id, isActive: !sequence.isActive },
        {
          onSuccess: () =>
            toast.success(sequence.isActive ? "Sequence paused" : "Sequence running"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateSequence],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteSequence.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Sequence deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteTarget(null);
      },
    });
  }, [deleteSequence, deleteTarget]);

  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => {
      const sequence = sequences.find((candidate) => candidate.id === row.id);
      if (!sequence) return;
      setOpenTarget(sequence);
      setSheetOpen(true);
    },
    [sequences],
  );

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const sequence = sequences.find((candidate) => candidate.id === row.id);
      if (!sequence || !canManage) return null;
      return (
        <RecordRowActions
          editLabel={`Open ${sequence.name}`}
          deleteLabel={`Delete ${sequence.name}`}
          leading={
            <Switch
              checked={sequence.isActive}
              onCheckedChange={() => handleToggleActive(sequence)}
              aria-label={
                sequence.isActive ? `Pause ${sequence.name}` : `Start ${sequence.name}`
              }
            />
          }
          onEdit={() => {
            setOpenTarget(sequence);
            setSheetOpen(true);
          }}
          onDelete={() => setDeleteTarget(sequence)}
        />
      );
    },
    [sequences, canManage, handleToggleActive],
  );

  return (
    <PageWrapper
      title="Sequences"
      subtitle="A run of touches every enrolled lead, deal or contact receives."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New sequence
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!canManage ? (
          <NoPermissionState
            permission="crm:sequences:manage"
            className={CONTENT_FILL_PANEL}
            description="Outreach sequences are managed by your sales operations team."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={10} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load sequences"
            description="The sequence list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : sequences.length === 0 ? (
          <EmptyState
            illustration={<AutomationsIllustration />}
            title="No sequences yet"
            description="A sequence is a run of touches — an email, a call task, a wait — that every enrolled record receives in order."
            action={{ label: "New sequence", onClick: handleOpenCreate }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={asRecordValues(sequences)}
            getRowKey={(row) => String(row.id)}
            onRowClick={handleRowClick}
            actions={rowActions}
            density={density}
            minWidth="820px"
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <SequenceSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        sequence={openTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this sequence?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be deleted and every enrolment still running will stop. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete sequence"
        destructive
        isPending={deleteSequence.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
