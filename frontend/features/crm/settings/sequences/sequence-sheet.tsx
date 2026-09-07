"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared";
import { RecordForm, RecordList, asRecordValues, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  useCreateCrmSequence,
  useCreateCrmSequenceStep,
  useCrmSequenceEnrollments,
  useCrmSequenceSteps,
  useDeleteCrmSequenceStep,
  useStopEnrollment,
  useUpdateCrmSequence,
} from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  SEQUENCE_ENROLLMENT_LAYOUT,
  SEQUENCE_LAYOUT,
  SEQUENCE_STEP_LAYOUT,
} from "@/lib/renderer/crm/settings/sequence-layout";
import type { CrmSequence, SequenceStepType } from "@/types/crm";
import { RecordRowActions } from "../shared/record-row-actions";
import {
  flagOrOmit,
  numberOrOmit,
  requiredText,
  textOrNull,
  textOrOmit,
} from "../shared/record-payload";

/**
 * A sequence: what it is, what it does, and who it is doing it to.
 *
 * Three generated surfaces in three tabs rather than three hand-written ones.
 * Tabs, not steps — nothing here has a next button and nothing is lost by
 * closing the sheet, so a sheet is the right rung rather than a page.
 */

const STEP_TYPES: readonly SequenceStepType[] = ["email", "call_task", "whatsapp_task", "wait"];

function toStepType(value: string | undefined): SequenceStepType | undefined {
  return STEP_TYPES.find((candidate) => candidate === value);
}

interface SequenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequence: CrmSequence | null;
}

export function SequenceSheet({ open, onOpenChange, sequence }: SequenceSheetProps) {
  const layout = useTenantLayout(SEQUENCE_LAYOUT);
  const createSequence = useCreateCrmSequence();
  const updateSequence = useUpdateCrmSequence();
  const isEditing = sequence !== null;
  const isPending = createSequence.isPending || updateSequence.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (sequence) {
      updateSequence.mutate(
        {
          id: sequence.id,
          name: textOrOmit(values, "name"),
          description: textOrNull(values, "description"),
          entityType: textOrOmit(values, "entityType"),
          isActive: flagOrOmit(values, "isActive"),
        },
        {
          onSuccess: () => {
            toast.success("Sequence updated");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    createSequence.mutate(
      {
        name: requiredText(values, "name"),
        description: textOrOmit(values, "description"),
        entityType: values.entityType?.trim() || "lead",
        isActive: flagOrOmit(values, "isActive"),
      },
      {
        onSuccess: () => {
          toast.success("Sequence created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? sequence.name : "New sequence"}</SheetTitle>
          <SheetDescription>
            A sequence sends the same run of touches to every record enrolled in it.
          </SheetDescription>
        </SheetHeader>

        {isEditing ? (
          <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b px-6 py-2">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="steps">Steps</TabsTrigger>
                <TabsTrigger value="enrolments">Enrolments</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="mt-0 flex min-h-0 flex-1 flex-col">
              <SheetBody className="px-6 py-5">
                <RecordForm
                  key={sequence.id}
                  layout={layout}
                  mode="edit"
                  initial={{
                    name: sequence.name,
                    description: sequence.description ?? "",
                    entityType: sequence.entityType,
                    isActive: sequence.isActive,
                  }}
                  onSubmit={handleSubmit}
                  onCancel={handleClose}
                  isSubmitting={isPending}
                  submitLabel="Save changes"
                />
              </SheetBody>
            </TabsContent>

            <TabsContent value="steps" className="mt-0 flex min-h-0 flex-1 flex-col">
              <SheetBody className="px-6 py-5">
                <SequenceSteps sequenceId={sequence.id} />
              </SheetBody>
            </TabsContent>

            <TabsContent value="enrolments" className="mt-0 flex min-h-0 flex-1 flex-col">
              <SheetBody className="px-6 py-5">
                <SequenceEnrolments sequenceId={sequence.id} />
              </SheetBody>
            </TabsContent>
          </Tabs>
        ) : (
          <SheetBody className="px-6 py-5">
            <RecordForm
              key="new"
              layout={layout}
              mode="create"
              initial={{ entityType: "lead", isActive: "false" }}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isSubmitting={isPending}
              submitLabel="Create sequence"
            />
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SequenceSteps({ sequenceId }: { sequenceId: string }) {
  const layout = useTenantLayout(SEQUENCE_STEP_LAYOUT);
  const { data, isLoading, isError, refetch } = useCrmSequenceSteps(sequenceId);
  const createStep = useCreateCrmSequenceStep(sequenceId);
  const deleteStep = useDeleteCrmSequenceStep(sequenceId);
  const [formGeneration, setFormGeneration] = useState(0);

  const steps = [...(data?.steps ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDelete = useCallback(
    (stepId: string) => {
      deleteStep.mutate(stepId, {
        onSuccess: () => toast.success("Step removed"),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [deleteStep],
  );

  const rowActions = useCallback(
    (row: Record<string, unknown>) => (
      <RecordRowActions
        deleteLabel="Remove step"
        onDelete={() => handleDelete(String(row.id))}
      />
    ),
    [handleDelete],
  );

  function handleAddStep(values: RecordFormValues) {
    const stepType = toStepType(values.stepType);
    if (!stepType) return;
    createStep.mutate(
      { stepType, waitHours: numberOrOmit(values, "waitHours") },
      {
        onSuccess: () => {
          toast.success("Step added");
          setFormGeneration((generation) => generation + 1);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <div className="flex flex-col gap-gap-section">
      {isLoading ? (
        <DataTableSkeleton rows={5} columns={layout.list.columns.length} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load the steps"
          description="This sequence's steps didn't load. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      ) : steps.length === 0 ? (
        <EmptyState
          compact
          illustrationPreset="automations"
          title="No steps yet"
          description="Add the first touch below and every record enrolled will receive it."
        />
      ) : (
        <RecordList
          layout={layout}
          rows={asRecordValues(steps)}
          getRowKey={(row) => String(row.id)}
          actions={rowActions}
          density="compact"
          minWidth="420px"
        />
      )}

      <div className="rounded-xl border border-border bg-card p-card-pad">
        <RecordForm
          key={formGeneration}
          layout={layout}
          mode="create"
          initial={{ stepType: "email" }}
          onSubmit={handleAddStep}
          isSubmitting={createStep.isPending}
          submitLabel="Add step"
        />
      </div>
    </div>
  );
}

function SequenceEnrolments({ sequenceId }: { sequenceId: string }) {
  const layout = useTenantLayout(SEQUENCE_ENROLLMENT_LAYOUT);
  const { data, isLoading, isError, refetch, access } = useCrmSequenceEnrollments(sequenceId, 1);
  const stopEnrollment = useStopEnrollment(sequenceId);

  const enrolments = data?.enrollments ?? [];

  const handleStop = useCallback(
    (enrollmentId: string) => {
      stopEnrollment.mutate(enrollmentId, {
        onSuccess: () => toast.success("Enrolment stopped"),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [stopEnrollment],
  );

  const rowActions = useCallback(
    (row: Record<string, unknown>) =>
      row.status === "active" ? (
        <LoadingButton
          type="button"
          variant="outline"
          size="sm"
          isPending={stopEnrollment.isPending}
          onClick={() => handleStop(String(row.id))}
        >
          Stop
        </LoadingButton>
      ) : null,
    [handleStop, stopEnrollment.isPending],
  );

  if (isLoading) return <DataTableSkeleton rows={6} columns={layout.list.columns.length} />;

  if (isError)
    return (
      <ErrorState
        title="Couldn't load enrolments"
        description="The enrolment list didn't load. Check your connection and try again."
        onRetry={() => void refetch()}
      />
    );

  if (enrolments.length === 0)
    return (
      <EmptyState
          access={access}
        compact
        illustrationPreset="team"
        title="Nobody is enrolled"
        description="Records join a sequence from a lead or deal, or from an automation that enrols them."
      />
    );

  return (
    <RecordList
      layout={layout}
      rows={asRecordValues(enrolments)}
      getRowKey={(row) => String(row.id)}
      actions={rowActions}
      density="compact"
      minWidth="520px"
    />
  );
}
