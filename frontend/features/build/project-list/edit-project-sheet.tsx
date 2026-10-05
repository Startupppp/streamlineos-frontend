"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { useUpdateProject } from "@/hooks/api/build/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  ReassignDialog,
} from "@/features/build/settings/project-member-selector";
import {
  editProjectSchema,
  toProjectPriority,
  toProjectStatus,
  type EditProjectFormValues,
} from "./edit-project-schema";
import type { ProjectListItem } from "@/types/projects/projects";
import { EditProjectFormFields } from "./edit-project-form-fields";

function toDateString(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

interface EditProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectListItem;
}

export function EditProjectSheet({
  open,
  onOpenChange,
  project,
}: EditProjectSheetProps) {
  const updateProject = useUpdateProject();

  const [reassignDialog, setReassignDialog] = useState<{
    memberId: string;
    memberName: string;
  } | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("__unassign__");
  const reassignmentsRef = useRef<Record<string, string>>({});
  const pendingFieldChangeRef = useRef<(() => void) | null>(null);

  const originalMemberIds = project.members.map((m) => m.id);

  const form = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
      status: toProjectStatus(project.status),
      priority: toProjectPriority(project.priority),
      managerId: project.manager?.id ?? undefined,
      startDate: toDateString(project.startDate),
      endDate: toDateString(project.endDate),
      memberIds: originalMemberIds,
    },
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  useEffect(() => {
    if (open) {
      form.reset({
        name: project.name,
        description: project.description ?? "",
        status: toProjectStatus(project.status),
        priority: toProjectPriority(project.priority),
        managerId: project.manager?.id ?? undefined,
        startDate: toDateString(project.startDate),
        endDate: toDateString(project.endDate),
        memberIds: project.members.map((m) => m.id),
      });
      reassignmentsRef.current = {};
    }
  }, [open, project, form]);

  const watchedStartDate = form.watch("startDate");

  const handleMemberRemoved = useCallback(
    (memberId: string, memberName: string, applyChange: () => void) => {
      setReassignTo("__unassign__");
      pendingFieldChangeRef.current = applyChange;
      setReassignDialog({ memberId, memberName });
    },
    [],
  );

  const confirmReassign = useCallback(() => {
    if (!reassignDialog) return;
    if (reassignTo && reassignTo !== "__unassign__") {
      reassignmentsRef.current[reassignDialog.memberId] = reassignTo;
    } else {
      delete reassignmentsRef.current[reassignDialog.memberId];
    }
    pendingFieldChangeRef.current?.();
    pendingFieldChangeRef.current = null;
    setReassignDialog(null);
  }, [reassignDialog, reassignTo]);

  const cancelReassign = useCallback(() => {
    pendingFieldChangeRef.current = null;
    setReassignDialog(null);
  }, []);

  function handleStartDateChange(value: string) {
    form.setValue("startDate", value, { shouldValidate: true });
    const currentEnd = form.getValues("endDate") ?? "";
    const nextEnd = clearEndIfInvalid(value, currentEnd, "after");
    if (nextEnd !== currentEnd) {
      form.setValue("endDate", nextEnd, { shouldValidate: true });
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  function handleMemberIdsChange(ids: string[]) {
    form.setValue("memberIds", ids, { shouldDirty: true });
  }

  function handleSubmit(values: EditProjectFormValues) {
    const reassignments =
      Object.keys(reassignmentsRef.current).length > 0
        ? { ...reassignmentsRef.current }
        : undefined;

    updateProject.mutate(
      {
        projectId: project.id,
        name: values.name,
        description: values.description,
        status: values.status,
        priority: values.priority,
        managerId: values.managerId,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        memberIds: values.memberIds,
        ...(reassignments ? { reassignments } : {}),
      },
      {
        onSuccess: () => {
          reassignmentsRef.current = {};
          toast.success("Project updated");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  const startPickerBounds = planningStartPickerProps();
  const endPickerBounds = planningEndPickerProps({
    startDate: watchedStartDate,
    mode: "after",
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden"
        >
          <SheetHeader className="bg-muted/40 p-6 pb-4 pr-12 border-b text-left">
            <SheetTitle className="text-xl font-medium tracking-tight">
              Edit Project
            </SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              <SheetBody className="px-6 py-4 space-y-4">
                <EditProjectFormFields
                  form={form}
                  handleStartDateChange={handleStartDateChange}
                  handleMemberRemoved={handleMemberRemoved}
                  handleMemberIdsChange={handleMemberIdsChange}
                  originalMemberIds={originalMemberIds}
                  startPickerBounds={startPickerBounds}
                  endPickerBounds={endPickerBounds}
                />
              </SheetBody>

              <SheetFooter className="border-t px-6 py-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateProject.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isPending={updateProject.isPending}
                  loadingText="Saving…"
                  className="flex-1"
                >
                  Save Changes
                </LoadingButton>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <ReassignDialog
        open={reassignDialog !== null}
        memberName={reassignDialog?.memberName ?? ""}
        removedMemberId={reassignDialog?.memberId ?? ""}
        currentMemberIds={form.getValues("memberIds") ?? []}
        reassignTo={reassignTo}
        onReassignToChange={setReassignTo}
        onConfirm={confirmReassign}
        onCancel={cancelReassign}
      />
    </>
  );
}
