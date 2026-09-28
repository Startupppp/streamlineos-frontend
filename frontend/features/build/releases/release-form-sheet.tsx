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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[140px]" />
    ),
  },
);
import {
  releaseBaseKey,
  useCreateRelease,
  useUpdateRelease,
  type Release,
} from "@/hooks/api/build/releases";
import { toast } from "sonner";
import { getApiErrorCode, isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { TicketConflictDialog } from "@/features/build/ticket-details/ticket-conflict-dialog";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";

const CONFLICT_EMPTY = "Not set";

function displayConflictValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return CONFLICT_EMPTY;
  return String(value);
}

function buildReleaseConflictDiffs(
  values: ReleaseFormValues,
  baseline: Release,
): TicketConflictFieldDiff[] {
  const stripMarkup = (value: string | null) => (value === null ? null : value.replace(/<[^>]*>/g, "").trim() || null);
  const pairs: Array<{ key: string; label: string; server: unknown; pending: unknown }> = [
    { key: "name", label: "Name", server: baseline.name, pending: values.name.trim() },
    { key: "version", label: "Version", server: baseline.version, pending: values.version.trim() },
    { key: "status", label: "Status", server: baseline.status, pending: values.status },
    { key: "releaseDate", label: "Release date", server: baseline.releaseDate ?? null, pending: values.releaseDate || null },
    { key: "description", label: "Notes", server: stripMarkup(baseline.description ?? null), pending: stripMarkup(values.description ?? null) },
  ];
  return pairs
    .filter(({ server, pending }) => String(server ?? "") !== String(pending ?? ""))
    .map(({ key, label, server, pending }) => ({
      key,
      label,
      serverValue: displayConflictValue(server),
      pendingValue: displayConflictValue(pending),
    }));
}

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

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseFormSchema),
    defaultValues: {
      name: release?.name ?? "",
      version: release?.version ?? "",
      description: release?.description ?? null,
      status: release?.status ?? "draft",
      releaseDate: release?.releaseDate ?? null,
    },
  });
  useRegisterDirtyState(form.formState.isDirty);

  const descriptionValue = form.watch("description");

  const descriptionCharCount = (descriptionValue ?? "").replace(/<[^>]*>/g, "").length;

  const onSubmit = useCallback(
    (values: ReleaseFormValues) => {
      if (isEdit) {
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
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Q3 Release" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 1.4.0" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="released">Released</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ?? ""}
                          onChange={(val) => field.onChange(val || null)}
                          placeholder="Pick a date"
                          className="text-sm"
                          disablePast
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Release Notes</FormLabel>
                      <span className={`text-micro tabular-nums ${descriptionCharCount > 10000 ? "text-destructive" : "text-muted-foreground"}`}>
                        {descriptionCharCount.toLocaleString()} / 10,000
                      </span>
                    </div>
                    <FormControl>
                      <div className="rounded-md border border-input min-h-[140px]">
                        <TiptapEditor
                          content={field.value ?? ""}
                          onChangeHtml={(html) => field.onChange(html || null)}
                          placeholder="Describe what's in this release…"
                          menuMode="static"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
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
    </>
  );
}
