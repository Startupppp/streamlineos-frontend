"use client";

import { useEffect, useRef } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UserCombobox } from "@/components/ui/user-combobox";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateFeedbucketWidget } from "@/hooks/api/feedbucket";
import type { CreateFeedbucketWidgetInput } from "@/types/feedbucket";
import {
  createFeedbucketWidgetSchema,
  type CreateFeedbucketWidgetFormValues,
} from "./create-feedbucket-widget-schema";

interface CreateFeedbucketWidgetSheetProps {
  open: boolean;
  projectId: number;
  defaultName: string;
  onClose: () => void;
}

export function CreateFeedbucketWidgetSheet({
  open,
  projectId,
  defaultName,
  onClose,
}: CreateFeedbucketWidgetSheetProps) {
  const createWidget = useCreateFeedbucketWidget();

  const form = useForm<CreateFeedbucketWidgetFormValues>({
    resolver: zodResolver(createFeedbucketWidgetSchema),
    defaultValues: { name: defaultName, aiAssistEnabled: false, autoCreateTicket: false, defaultAssigneeId: "" },
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  const pendingNameRef = useRef(defaultName);

  useEffect(() => {
    pendingNameRef.current = defaultName;
  }, [defaultName]);

  useEffect(() => {
    if (!open) return;
    form.reset({ name: pendingNameRef.current, aiAssistEnabled: false, autoCreateTicket: false, defaultAssigneeId: "" });
  }, [open, form]);

  async function handleSubmit(values: CreateFeedbucketWidgetFormValues) {
    const input: CreateFeedbucketWidgetInput = {
      name: values.name.trim(),
      projectId,
      allowedDomains: [],
      autoCreateTicket: values.autoCreateTicket ?? false,
      defaultTicketType: "BUG",
      aiAssistEnabled: values.aiAssistEnabled,
      defaultAssigneeId: values.defaultAssigneeId || null,
    };
    try {
      await createWidget.mutateAsync(input);
      toast.success("Feedback widget created");
      form.reset();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) onClose();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Create Feedback Widget</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Widget name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Feedback widget" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aiAssistEnabled"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
                      <div className="space-y-0.5 min-w-0">
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          AI assist in widget
                        </FormLabel>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Let people submitting feedback draft a bug/feature with AI from their
                          screenshot. Uses your org&apos;s AI credits; rate-limited.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="shrink-0 mt-0.5"
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="autoCreateTicket"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
                      <div className="space-y-0.5 min-w-0">
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Auto-create ticket
                        </FormLabel>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Automatically create a ticket for every new submission received by this
                          widget.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          className="shrink-0 mt-0.5"
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultAssigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default assignee</FormLabel>
                    <FormControl>
                      <UserCombobox
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Select assignee…"
                        allowUnassigned
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Fallback used when no per-type assignee rule matches.
                    </p>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </SheetBody>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isPending={createWidget.isPending}
                  loadingText="Creating…"
                >
                  Create
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
