"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { releaseFormSchema, type ReleaseFormValues } from "./release-form-schema";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  releaseBaseKey,
  useCreateRelease,
  useUpdateRelease,
} from "@/hooks/api/build/releases";
import type { Release } from "@/types/projects";
import { toast } from "sonner";
import { getApiErrorCode, isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TicketConflictDialog } from "@/features/build/ticket-details/ticket-conflict-dialog";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";
import { buildReleaseConflictDiffs } from "./release-form-model";
import { ReleaseFormFields } from "./release-form-fields";

interface ReleaseFormSheetProps {
  projectId: number;
  release?: Release;
  onClose: () => void;
}

export function ReleaseFormSheet({ projectId, release, onClose }: ReleaseFormSheetProps) {
  const isEdit = !!release;
  const queryClient = useQueryClient();
  const create = useCreateRelease(projectId);
  const update = useUpdateRelease(projectId);
  const isPending = create.isPending || update.isPending;
  const [conflictFields, setConflictFields] = useState<TicketConflictFieldDiff[] | null>(null);
  const handleConflictDismiss = useCallback(() => setConflictFields(null), []);
  const [pendingPublishValues, setPendingPublishValues] = useState<ReleaseFormValues | null>(null);
  const handlePublishCancelled = useCallback(() => setPendingPublishValues(null), []);
  const handlePublishConfirmed = useCallback(() => {
    if (!release || !pendingPublishValues) return;
    const values = pendingPublishValues;
    setPendingPublishValues(null);
    update.mutate(
      {
        releaseId: release.id,
        rowVersion: release.rowVersion,
        name: values.name,
        version: values.version,
        description: values.description || null,
        status: values.status,
        releaseDate: values.releaseDate || null,
        previewConfirmed: true,
      },
      {
        onSuccess: () => { toast.success("Release updated"); onClose(); },
        onError: (err) => {
          if (isApiError(err) && getApiErrorCode(err) === "PROJECTS_TICKET_CONFLICT") {
            void queryClient.invalidateQueries({ queryKey: releaseBaseKey(projectId) });
            const diffs = buildReleaseConflictDiffs(values, release);
            if (diffs.length > 0) { setConflictFields(diffs); return; }
            toast.warning("This release was modified by another user. Your changes were not saved — reopen it to see the latest version.");
            return;
          }
          toast.error(getErrorMessage(err));
        },
      },
    );
  }, [release, pendingPublishValues, update, onClose, queryClient, projectId]);

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseFormSchema),
    defaultValues: {
      name: release?.name ?? "",
      version: release?.version ?? "",
      description: release?.description ?? null,
      status: release?.status ?? "draft",
      releaseDate: release?.releaseDate ?? null,
      readiness: null,
      riskLevel: null,
    },
  });
  useRegisterDirtyState(form.formState.isDirty);

  const descriptionValue = form.watch("description");

  const descriptionCharCount = (descriptionValue ?? "").replace(/<[^>]*>/g, "").length;

  const onSubmit = useCallback(
    (values: ReleaseFormValues) => {
      if (isEdit) {
        if (values.status === "released" && release.status !== "released") {
          setPendingPublishValues(values);
          return;
        }
        update.mutate(
          {
            releaseId: release.id,
            rowVersion: release.rowVersion,
            name: values.name,
            version: values.version,
            description: values.description || null,
            status: values.status,
            releaseDate: values.releaseDate || null,
          },
          {
            onSuccess: () => { toast.success("Release updated"); onClose(); },
            onError: (err) => {
              if (isApiError(err) && getApiErrorCode(err) === "PROJECTS_TICKET_CONFLICT") {
                void queryClient.invalidateQueries({ queryKey: releaseBaseKey(projectId) });
                const diffs = buildReleaseConflictDiffs(values, release);
                if (diffs.length > 0) {
                  setConflictFields(diffs);
                  return;
                }
                toast.warning("This release was modified by another user. Your changes were not saved — reopen it to see the latest version.");
                return;
              }
              toast.error(getErrorMessage(err));
            },
          },
        );
      } else {
        create.mutate(
          {
            name: values.name,
            version: values.version,
            description: values.description || null,
            status: values.status,
            releaseDate: values.releaseDate || null,
          },
          {
            onSuccess: () => { toast.success("Release created"); onClose(); },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      }
    },
    [isEdit, release, create, update, onClose, projectId, queryClient],
  );

  return (
    <>
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{isEdit ? "Edit Release" : "New Release"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the release version, status, date, and notes."
              : "Create a release to track a shipped version and its notes."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-4 space-y-4">
              <ReleaseFormFields
                control={form.control}
                descriptionCharCount={descriptionCharCount}
              />
            </SheetBody>

            <SheetFooter className="px-6 py-4 border-t">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={isPending} loadingText="Saving…">
                  {isEdit ? "Save Changes" : "Create Release"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
    <TicketConflictDialog
      open={conflictFields !== null}
      fields={conflictFields ?? []}
      onKeepMine={handleConflictDismiss}
      onDiscard={handleConflictDismiss}
    />
    <ConfirmDialog
      title={`Publish "${pendingPublishValues?.name ?? "this release"}"?`}
      description="This will mark the release as published and record the publication timestamp. You can revert to draft afterwards if needed."
      confirmLabel="Publish"
      onConfirm={handlePublishConfirmed}
      isPending={update.isPending}
      open={pendingPublishValues !== null}
      onOpenChange={(open) => { if (!open) handlePublishCancelled(); }}
    />
    </>
  );
}
