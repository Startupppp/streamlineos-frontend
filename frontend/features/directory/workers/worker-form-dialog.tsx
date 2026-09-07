"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Checkbox } from "@/components/ui/checkbox";
import { AppDialog } from "@/components/shared/app-dialog";
import { MemberPicker } from "@/components/members/member-picker";
import { useCreateWorker } from "@/hooks/api/directory/workers";
import { getErrorMessage } from "@/lib/get-error-message";

const workerSchema = z
  .object({
    organizationPersonId: z.string().optional(),
    memberUserId: z.string().optional(),
    workerNumber: z.string().max(50).optional(),
    isPayee: z.boolean(),
  })
  .refine(
    (value) => Boolean(value.organizationPersonId || value.memberUserId),
    { message: "Member is required", path: ["memberUserId"] },
  );

type WorkerFormValues = z.infer<typeof workerSchema>;

const EMPTY_DEFAULTS: WorkerFormValues = {
  organizationPersonId: "",
  memberUserId: "",
  workerNumber: "",
  isPayee: false,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOrganizationPersonId?: string;
}

export function WorkerFormDialog({
  open,
  onOpenChange,
  defaultOrganizationPersonId,
}: Props) {
  const createWorker = useCreateWorker();

  const form = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      organizationPersonId: defaultOrganizationPersonId ?? "",
      memberUserId: "",
      workerNumber: "",
      isPayee: false,
    });
  }, [open, form, defaultOrganizationPersonId]);

  function handleSubmit(values: WorkerFormValues) {
    const subject = values.organizationPersonId
      ? { organizationPersonId: values.organizationPersonId }
      : { memberUserId: values.memberUserId ?? "" };
    createWorker.mutate(
      {
        ...subject,
        workerNumber: values.workerNumber || undefined,
        isPayee: values.isPayee,
      },
      {
        onSuccess: () => {
          toast.success("Worker added");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleCancel() {
    onOpenChange(false);
  }

  const formId = "worker-create-form";

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={createWorker.isPending}
      >
        Cancel
      </Button>
      <LoadingButton
        type="submit"
        form={formId}
        size="sm"
        isPending={createWorker.isPending}
        loadingText="Saving…"
      >
        Add Worker
      </LoadingButton>
    </>
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Worker"
      description={
        defaultOrganizationPersonId
          ? "Add this directory person to workforce processes."
          : "Select an organization member to create their worker record."
      }
      footer={footer}
    >
      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          noValidate
        >
          {!defaultOrganizationPersonId ? (
            <FormField
              control={form.control}
              name="memberUserId"
              render={({ field }) => {
                function handleMemberChange(userId: string | null) {
                  field.onChange(userId ?? "");
                }

                return (
                  <FormItem>
                    <FormLabel>Organization member</FormLabel>
                    <FormControl>
                      <MemberPicker
                        value={field.value || undefined}
                        onChange={handleMemberChange}
                        placeholder="Search and select a member…"
                        disabled={createWorker.isPending}
                      />
                    </FormControl>
                    <p className="text-xs leading-5 text-muted-foreground">
                      If this member has no person record yet, StreamlineOS
                      creates and links it automatically.
                    </p>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          ) : null}
          <FormField
            control={form.control}
            name="workerNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Worker number (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. EMP-001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isPayee"
            render={({ field }) => (
              <FormItem>
                <label className="flex cursor-pointer items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="worker-is-payee"
                    />
                  </FormControl>
                  <span className="text-sm">Mark as payee</span>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppDialog>
  );
}
