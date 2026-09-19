"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRegisterBuildDirtyState } from "@/features/build/navigation/build-dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { useUpdateProject } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { MemberPicker } from "@/components/members/member-picker";
import {
  MembersSelector,
  ReassignDialog,
} from "@/features/build/settings/project-members-section";
import {
  editProjectSchema,
  toProjectPriority,
  toProjectStatus,
  type EditProjectFormValues,
} from "./edit-project-schema";
import type { ProjectListItem } from "@/types/projects/projects";

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
  useRegisterBuildDirtyState(open && form.formState.isDirty);

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
            <SheetTitle className="text-xl font-semibold tracking-tight">
              Edit Project
            </SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              <SheetBody className="px-6 py-4 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Website Redesign" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What is this project about?"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Lead</FormLabel>
                      <FormControl>
                        <MemberPicker
                          value={field.value}
                          onChange={(userId) => {
                            field.onChange(userId ?? undefined);
                          }}
                          allowUnassigned
                          placeholder="Unassigned"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={handleStartDateChange}
                            placeholder="Start date"
                            dateFormat="dd/MM/yyyy"
                            fromDate={startPickerBounds.fromDate}
                            fromYear={startPickerBounds.fromYear}
                            toYear={startPickerBounds.toYear}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Target date"
                            dateFormat="dd/MM/yyyy"
                            fromDate={endPickerBounds.fromDate}
                            fromYear={endPickerBounds.fromYear}
                            toYear={endPickerBounds.toYear}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Team Members
                  </div>
                  <MembersSelector
                    memberIds={form.watch("memberIds") ?? []}
                    onMemberIdsChange={(ids) => form.setValue("memberIds", ids, { shouldDirty: true })}
                    originalMemberIds={originalMemberIds}
                    onMemberRemoved={handleMemberRemoved}
                  />
                </div>
              </SheetBody>

              <SheetFooter className="border-t px-6 py-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
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
