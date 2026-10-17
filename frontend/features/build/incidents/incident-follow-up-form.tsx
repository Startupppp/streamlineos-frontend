"use client";

import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  useAddIncidentFollowUpAction,
  useUpdateIncidentFollowUpAction,
} from "@/hooks/api/build/incident-mutations";
import {
  incidentFollowUpSchema,
  type IncidentFollowUpValues,
} from "@/features/build/incidents/incident-schema";
import type { IncidentsAddFollowUpActionResponse } from "@/contracts/build-contracts.generated";
import { ProjectMemberSelect } from "@/components/members/project-member-select";

export function EditFollowUpDialog({
  projectId,
  incidentId,
  action,
  open,
  onOpenChange,
}: {
  projectId: number;
  incidentId: number;
  action: IncidentsAddFollowUpActionResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateAction = useUpdateIncidentFollowUpAction();
  const form = useForm<IncidentFollowUpValues>({
    resolver: zodResolver(incidentFollowUpSchema),
    values: {
      title: action.title,
      description: action.description ?? "",
      ownerId: action.ownerId ?? "",
      dueAt: action.dueAt?.slice(0, 10) ?? "",
    },
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  function handleSubmit(values: IncidentFollowUpValues) {
    updateAction.mutate(
      {
        projectId,
        incidentId,
        followUpActionId: action.id,
        title: values.title,
        description: values.description || null,
        ownerId: values.ownerId || null,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          toast.success("Follow-up updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit follow-up</DialogTitle>
          <DialogDescription>
            Update the follow-up owner, due date, and notes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-3"
          >
            <FollowUpFields form={form} projectId={projectId} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={updateAction.isPending}
                loadingText="Saving…"
              >
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function FollowUpFields({
  form,
  projectId,
  includeTitle = true,
}: {
  form: UseFormReturn<IncidentFollowUpValues>;
  projectId: number;
  includeTitle?: boolean;
}) {
  return (
    <>
      {includeTitle ? (
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Title</FormLabel>
              <FormControl>
                <Input {...field} className="text-dense" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
      ) : null}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-dense">Description</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className="min-h-[72px] resize-none text-dense"
              />
            </FormControl>
            <FormMessage className="text-micro" />
          </FormItem>
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Owner</FormLabel>
              <ProjectMemberSelect
                projectId={projectId}
                mode="single"
                value={field.value}
                onChange={(value) => field.onChange(value ?? "")}
                allowUnassigned
                placeholder="Unassigned"
              />
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Due date</FormLabel>
              <FormControl>
                <DatePicker
                  ariaLabel="Due date"
                  clearable
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick a due date"
                />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}

export function AddFollowUpForm({
  projectId,
  incidentId,
}: {
  projectId: number;
  incidentId: number;
}) {
  const addAction = useAddIncidentFollowUpAction();
  const form = useForm<IncidentFollowUpValues>({
    resolver: zodResolver(incidentFollowUpSchema),
    defaultValues: { title: "", description: "", ownerId: "", dueAt: "" },
  });
  useRegisterDirtyState(form.formState.isDirty);

  function handleSubmit(values: IncidentFollowUpValues) {
    addAction.mutate(
      {
        projectId,
        incidentId,
        title: values.title,
        description: values.description || undefined,
        ownerId: values.ownerId || undefined,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Follow-up added");
          form.reset({ title: "", description: "", ownerId: "", dueAt: "" });
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-2 border-t pt-3"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">
                Add follow-up <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="What must happen before this is done?"
                  className="text-dense"
                />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <FollowUpFields
          form={form}
          projectId={projectId}
          includeTitle={false}
        />
        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            size="sm"
            className="text-dense"
            isPending={addAction.isPending}
            loadingText="Adding…"
          >
            Add Follow-up
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
