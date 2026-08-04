"use client";

import { useEffect, useMemo } from "react";
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
import { usePeople } from "@/hooks/api/directory/people";
import { getErrorMessage } from "@/lib/get-error-message";

const workerSchema = z.object({
  organizationPersonId: z.string().min(1, "Person is required"),
  workerNumber: z.string().max(50).optional(),
  isPayee: z.boolean(),
});

type WorkerFormValues = z.infer<typeof workerSchema>;

const EMPTY_DEFAULTS: WorkerFormValues = {
  organizationPersonId: "",
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
  const { data: peoplePage } = usePeople(
    {
      page: 1,
      limit: 100,
    },
  );

  const personIdByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of peoplePage?.data ?? []) {
      if (person.userId) {
        map.set(person.userId, person.organizationPersonId);
      }
    }
    return map;
  }, [peoplePage?.data]);

  const userIdByPersonId = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of peoplePage?.data ?? []) {
      if (person.userId) {
        map.set(person.organizationPersonId, person.userId);
      }
    }
    return map;
  }, [peoplePage?.data]);

  const form = useForm<WorkerFormValues>({
    resolver: zodResolver(workerSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      organizationPersonId: defaultOrganizationPersonId ?? "",
      workerNumber: "",
      isPayee: false,
    });
  }, [open, form, defaultOrganizationPersonId]);

  function handleSubmit(values: WorkerFormValues) {
    createWorker.mutate(
      {
        organizationPersonId: values.organizationPersonId,
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
      description="Link an organization person as a worker."
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
              name="organizationPersonId"
              render={({ field }) => {
                function handleMemberChange(userId: string | null) {
                  if (!userId) {
                    field.onChange("");
                    return;
                  }
                  const personId = personIdByUserId.get(userId);
                  if (!personId) {
                    toast.error("This member has no directory person record yet.");
                    return;
                  }
                  field.onChange(personId);
                }

                return (
                  <FormItem>
                    <FormLabel>Person</FormLabel>
                    <FormControl>
                      <MemberPicker
                        value={userIdByPersonId.get(field.value) ?? undefined}
                        onChange={handleMemberChange}
                        placeholder="Search and select a person…"
                        disabled={createWorker.isPending}
                      />
                    </FormControl>
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
