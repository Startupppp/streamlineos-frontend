"use client";

import { useEffect } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { incidentFormSchema, type IncidentFormValues } from "@/features/build/incidents/incident-schema";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateIncident, useUpdateIncident } from "@/hooks/api/build/incident-mutations";
import { useProject } from "@/hooks/api/build/projects";
import { useReleases } from "@/hooks/api/build/releases";
import type {
  IncidentsCreateIncidentResponse,
  IncidentsGetIncidentResponse,
} from "@/contracts/build-contracts.generated";
import {
  SEVERITIES,
  STATUSES,
  NO_RELEASE,
  DEFAULT_VALUES,
  toLocalDt,
} from "./incident-sheet-constants";
import { IncidentSheetFields } from "./incident-sheet-fields";

interface IncidentSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editIncident: IncidentsCreateIncidentResponse | IncidentsGetIncidentResponse | null;
}

export function IncidentSheet({ projectId, open, onOpenChange, editIncident }: IncidentSheetProps) {
  const create = useCreateIncident();
  const update = useUpdateIncident();
  const { data: project } = useProject(projectId);
  const releasesPage = useReleases(projectId);
  const releases = releasesPage.data?.data ?? [];
  const projectKey = project?.key ?? "";

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  useRegisterDirtyState(open && form.formState.isDirty);
  const selectedStatus = useWatch({ control: form.control, name: "status" });

  useEffect(() => {
    if (!open) return;
    if (editIncident) {
      form.reset({
        title: editIncident.title,
        description: editIncident.description ?? "",
        severity: SEVERITIES.find((value) => value === editIncident.severity) ?? "medium",
        status: STATUSES.find((value) => value === editIncident.status) ?? "detected",
        impact: editIncident.impact ?? "",
        ownerId: editIncident.ownerId ?? "",
        rootCause: editIncident.rootCause ?? "",
        customerComms: editIncident.customerComms ?? "",
        detectedAt: toLocalDt(editIncident.detectedAt),
        responseDueAt: toLocalDt(editIncident.responseDueAt),
        resolutionDueAt: toLocalDt(editIncident.resolutionDueAt),
        linkedTicketId:
          editIncident.linkedTicketId != null
            ? String(editIncident.linkedTicketId)
            : "",
        releaseId: editIncident.releaseId != null ? String(editIncident.releaseId) : "",
        followUpWaiverReason: "",
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, editIncident, form]);

  function handleSubmit(values: IncidentFormValues) {
    const followUpActions = editIncident && "followUpActions" in editIncident
      ? editIncident.followUpActions
      : [];
    const unresolvedFollowUps = followUpActions.filter(
      (action) => action.status === "open" || action.status === "in_progress",
    ).length;
    if (editIncident && values.status === "closed" && unresolvedFollowUps > 0 && !values.followUpWaiverReason.trim()) {
      form.setError("followUpWaiverReason", { message: "Explain why unresolved follow-ups can be waived" });
      return;
    }
    const input = {
      projectId,
      title: values.title,
      description: values.description || undefined,
      severity: values.severity,
      status: values.status,
      impact: values.impact || undefined,
      ownerId: values.ownerId || undefined,
      rootCause: values.rootCause || undefined,
      customerComms: values.customerComms || undefined,
      detectedAt: values.detectedAt
        ? new Date(values.detectedAt).toISOString()
        : undefined,
      responseDueAt: values.responseDueAt
        ? new Date(values.responseDueAt).toISOString()
        : undefined,
      resolutionDueAt: values.resolutionDueAt
        ? new Date(values.resolutionDueAt).toISOString()
        : undefined,
      linkedTicketId: values.linkedTicketId
        ? Number(values.linkedTicketId)
        : undefined,
      releaseId: values.releaseId && values.releaseId !== NO_RELEASE
        ? Number(values.releaseId)
        : undefined,
    };

    if (editIncident) {
      update.mutate(
        {
          ...input,
          incidentId: editIncident.id,
          followUpWaiverReason: values.followUpWaiverReason.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("IncidentsCreateIncidentResponse updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => {
          toast.success("IncidentsCreateIncidentResponse created");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-xl">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>
            {editIncident ? "Edit IncidentsCreateIncidentResponse" : "New IncidentsCreateIncidentResponse"}
          </SheetTitle>
          <SheetDescription>
            {editIncident
              ? "Update the incident details, ownership, and response milestones."
              : "Record the impact, owner, and response timeline for this incident."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="incident-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <IncidentSheetFields
              control={form.control}
              projectId={projectId}
              projectKey={projectKey}
              releases={releases}
              editIncident={editIncident}
              selectedStatus={selectedStatus}
            />

            <SheetFooter className="px-5 py-3 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <SheetClose asChild>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </SheetClose>
                <LoadingButton
                  type="submit"
                  size="sm"
                  isPending={isPending}
                  loadingText="Saving…"
                >
                  {editIncident ? "Save Changes" : "Create IncidentsCreateIncidentResponse"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
