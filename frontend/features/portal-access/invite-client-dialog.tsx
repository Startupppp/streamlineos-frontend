"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { AppDialog } from "@/components/shared/app-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useActivateClient } from "@/hooks/api/portal-access/grants";
import { useProjects } from "@/hooks/api/build/projects";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { numericSelectChange } from "@/lib/numeric-field";
import type { ActivationResult } from "@/hooks/api/portal-access/portal-access-schema";
import {
  activateClientFormSchema,
  type ActivateClientFormInput,
  type ActivateClientFormValues,
} from "./invite-client-schema";

const CAPABILITY_FIELDS = [
  { name: "canViewMilestones", label: "View milestones" },
  { name: "canViewTasks", label: "View tasks" },
  { name: "canViewAttachments", label: "View files" },
  { name: "canViewComments", label: "View comments" },
  { name: "canSubmitChangeRequests", label: "Submit change requests" },
] as const;

function makeDefaults(defaultProjectId?: number): ActivateClientFormInput {
  return {
    firstName: "",
    lastName: "",
    email: "",
    projectId: defaultProjectId ?? 0,
    canViewMilestones: false,
    canViewTasks: false,
    canViewAttachments: false,
    canViewComments: false,
    canSubmitChangeRequests: false,
  };
}

function DeliveryOutcomePanel({
  result,
  onClose,
}: {
  result: ActivationResult;
  onClose: () => void;
}) {
  const isQueued = result.deliveryOutcome === "QUEUED";
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Portal access activated for{" "}
        <span className="font-medium">{result.maskedRecipient}</span>.
      </p>
      <p className="text-sm text-muted-foreground">
        {isQueued
          ? "Invitation email queued for delivery."
          : "No email provider is connected — the client was not notified. Resend the invitation once a provider is configured."}
      </p>
      <div className="flex justify-end pt-2">
        <Button size="sm" variant="outline" onClick={onClose} type="button">
          Done
        </Button>
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: (result: ActivationResult) => void;
  defaultProjectId?: number;
}

export function InviteClientDialog({ open, onOpenChange, onInvited, defaultProjectId }: Props) {
  const canManage = useCan("build:clientvisibility:manage");
  const activate = useActivateClient();
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null);

  const { data: projectsPage } = useProjects(
    { limit: 100 },
    { enabled: open && !defaultProjectId && canManage },
  );

  const form = useForm<ActivateClientFormInput, unknown, ActivateClientFormValues>({
    resolver: zodResolver(activateClientFormSchema),
    defaultValues: makeDefaults(defaultProjectId),
  });

  useEffect(() => {
    if (open) {
      form.reset(makeDefaults(defaultProjectId));
      setActivationResult(null);
    }
  }, [open, defaultProjectId, form]);

  function handleSubmit(values: ActivateClientFormValues) {
    activate.mutate(
      {
        firstName: values.firstName,
        lastName: values.lastName || undefined,
        email: values.email,
        projectId: values.projectId,
        canViewMilestones: values.canViewMilestones,
        canViewTasks: values.canViewTasks,
        canViewAttachments: values.canViewAttachments,
        canViewComments: values.canViewComments,
        canSubmitChangeRequests: values.canSubmitChangeRequests,
      },
      {
        onSuccess: (result) => {
          setActivationResult(result);
          onInvited(result);
          if (result.deliveryOutcome === "QUEUED") {
            toast.success("Invitation sent");
          }
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleClose() {
    onOpenChange(false);
  }

  const showForm = !activationResult;

  const footer = showForm ? (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClose}
        disabled={activate.isPending}
      >
        Cancel
      </Button>
      <LoadingButton
        type="submit"
        form="activate-client-form"
        size="sm"
        isPending={activate.isPending}
        loadingText="Activating…"
        disabled={!canManage}
      >
        Invite Client
      </LoadingButton>
    </>
  ) : undefined;

  const projects = projectsPage?.data ?? [];

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite Client"
      description="Activate portal access and send the client their invitation link."
      footer={footer}
    >
      {!showForm && activationResult ? (
        <DeliveryOutcomePanel result={activationResult} onClose={handleClose} />
      ) : (
        <Form {...form}>
          <form
            id="activate-client-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Jane" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Last name{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Smith" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="jane@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!defaultProjectId && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      onValueChange={numericSelectChange(field.onChange)}
                      value={field.value ? String(field.value) : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Capabilities</p>
              {CAPABILITY_FIELDS.map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">{label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </form>
        </Form>
      )}
    </AppDialog>
  );
}
