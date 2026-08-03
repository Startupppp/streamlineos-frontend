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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AppDialog } from "@/components/shared/app-dialog";
import {
  usePortalMemberships,
  useCreateGrant,
  useUpdateGrant,
} from "@/hooks/api/portal-access/grants";
import type { ProjectClientGrant } from "@/types/portal-access/grants";
import { getErrorMessage } from "@/lib/get-error-message";

const grantSchema = z.object({
  portalMembershipId: z.string().min(1, "Membership is required"),
  projectId: z.string().regex(/^\d+$/, "Project ID must be a number"),
  canViewMilestones: z.boolean(),
  canViewTasks: z.boolean(),
  canViewAttachments: z.boolean(),
  canViewComments: z.boolean(),
  canSubmitChangeRequests: z.boolean(),
});

type GrantFormValues = z.infer<typeof grantSchema>;

const EMPTY_DEFAULTS: GrantFormValues = {
  portalMembershipId: "",
  projectId: "",
  canViewMilestones: false,
  canViewTasks: false,
  canViewAttachments: false,
  canViewComments: false,
  canSubmitChangeRequests: false,
};

function toFormValues(grant: ProjectClientGrant): GrantFormValues {
  return {
    portalMembershipId: grant.portalMembershipId,
    projectId: String(grant.projectId),
    canViewMilestones: grant.canViewMilestones,
    canViewTasks: grant.canViewTasks,
    canViewAttachments: grant.canViewAttachments,
    canViewComments: grant.canViewComments,
    canSubmitChangeRequests: grant.canSubmitChangeRequests,
  };
}

interface CreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create";
  defaultValues?: undefined;
}

interface EditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit";
  defaultValues: ProjectClientGrant;
}

type Props = CreateProps | EditProps;

function GrantFormDialogInner({ open, onOpenChange, mode, defaultValues }: Props) {
  const createGrant = useCreateGrant();
  const updateGrant = useUpdateGrant(
    mode === "edit" ? defaultValues.projectClientGrantId : "",
  );
  const { data: membershipsPage, isLoading: membershipsLoading } =
    usePortalMemberships({ limit: 100 });

  const form = useForm<GrantFormValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && defaultValues) {
      form.reset(toFormValues(defaultValues));
    } else {
      form.reset(EMPTY_DEFAULTS);
    }
  }, [open, mode, defaultValues, form]);

  const isPending =
    mode === "create" ? createGrant.isPending : updateGrant.isPending;

  const memberships = membershipsPage?.data ?? [];

  function handleSubmit(values: GrantFormValues) {
    if (mode === "create") {
      createGrant.mutate(
        {
          portalMembershipId: values.portalMembershipId,
          projectId: Number(values.projectId),
          canViewMilestones: values.canViewMilestones,
          canViewTasks: values.canViewTasks,
          canViewAttachments: values.canViewAttachments,
          canViewComments: values.canViewComments,
          canSubmitChangeRequests: values.canSubmitChangeRequests,
        },
        {
          onSuccess: () => {
            toast.success("Client access granted");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      updateGrant.mutate(
        {
          canViewMilestones: values.canViewMilestones,
          canViewTasks: values.canViewTasks,
          canViewAttachments: values.canViewAttachments,
          canViewComments: values.canViewComments,
          canSubmitChangeRequests: values.canSubmitChangeRequests,
        },
        {
          onSuccess: () => {
            toast.success("Visibility updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  const formId =
    mode === "edit" ? "grant-edit-form" : "grant-create-form";

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={isPending}
      >
        Cancel
      </Button>
      <LoadingButton
        type="submit"
        form={formId}
        size="sm"
        isPending={isPending}
        loadingText="Saving…"
      >
        {mode === "edit" ? "Save Changes" : "Grant Access"}
      </LoadingButton>
    </>
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit Visibility" : "Grant Client Access"}
      description={
        mode === "edit"
          ? "Update which project areas this client can see."
          : "Grant a client contact read-only visibility into a project."
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
          <FormField
            control={form.control}
            name="portalMembershipId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portal membership</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={mode === "edit" || membershipsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a membership…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {memberships.map((m) => {
                      const nameParts = [m.contactFirstName, m.contactLastName].filter(Boolean);
                      const displayName =
                        nameParts.length > 0
                          ? nameParts.join(" ")
                          : m.portalMembershipId.slice(0, 8) + "…";
                      return (
                        <SelectItem
                          key={m.portalMembershipId}
                          value={m.portalMembershipId}
                        >
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project ID</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    placeholder="Numeric project ID"
                    disabled={mode === "edit"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Visibility permissions
            </p>

            <FormField
              control={form.control}
              name="canViewMilestones"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    View milestones
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canViewTasks"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    View tasks
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canViewAttachments"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    View attachments
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canViewComments"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    View comments
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canSubmitChangeRequests"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    Submit change requests
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </AppDialog>
  );
}

export function GrantFormDialog(props: Props) {
  return <GrantFormDialogInner {...props} />;
}
