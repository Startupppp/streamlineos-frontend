"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Pencil } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form } from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useSlaPoliciesList, useCreateSlaPolicy, useUpdateSlaPolicy, useDeleteSlaPolicy,
  type SlaPolicy, type SlaPolicyPriority,
} from "@/hooks/api/support/sla-policies";
import { useBusinessHoursList } from "@/hooks/api/support/business-hours";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  policySchema, DEFAULT_FORM_VALUES, policyToFormValues, buildCreatePayload, buildUpdatePayload,
  type PolicyForm,
} from "@/features/support/settings/sla-policy-form.schema";
import { PolicyFormFields, type BusinessHoursOption } from "@/features/support/settings/sla-policy-form-fields";

const PRIORITY_BADGE: Record<SlaPolicyPriority, string> = {
  LOW: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  URGENT: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

export default function SupportSlaPage() {
  const { data: policies, isLoading, isError, refetch } = useSlaPoliciesList();
  const { data: businessHours } = useBusinessHoursList();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createPolicy = useCreateSlaPolicy();
  const updatePolicy = useUpdateSlaPolicy();
  const deletePolicy = useDeleteSlaPolicy();

  const businessHoursOptions: BusinessHoursOption[] = useMemo(
    () => (businessHours ?? []).map((bh) => ({ id: bh.id, name: bh.name })),
    [businessHours],
  );

  const businessHoursNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const bh of businessHours ?? []) map.set(bh.id, bh.name);
    return map;
  }, [businessHours]);

  const createForm = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const editForm = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const onCreateSubmit = useCallback((data: PolicyForm) => {
    createPolicy.mutate(buildCreatePayload(data), {
      onSuccess: () => { toast.success("SLA policy created"); setCreateOpen(false); createForm.reset(DEFAULT_FORM_VALUES); },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [createPolicy, createForm]);

  const onEditSubmit = useCallback((data: PolicyForm) => {
    if (editingId === null) return;
    updatePolicy.mutate(
      { id: editingId, ...buildUpdatePayload(data) },
      {
        onSuccess: () => { toast.success("Policy updated"); setEditingId(null); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [editingId, updatePolicy]);

  const handleStartEdit = useCallback((policy: SlaPolicy) => {
    setEditingId(policy.id);
    editForm.reset(policyToFormValues(policy));
  }, [editForm]);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);
  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deletePolicy.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Policy deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTargetId(null); },
    });
  }, [deletePolicy, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) handleDeleteCancel(); }, [handleDeleteCancel]);

  const count = policies?.length ?? 0;
  const enabledCount = policies?.filter((p) => p.isEnabled).length ?? 0;

  const columns = useMemo<DataTableColumn<SlaPolicy>[]>(() => {
    function makeEditHandler(policy: SlaPolicy) {
      return function handleEdit() { handleStartEdit(policy); };
    }
    function makeDeleteHandler(id: number) {
      return function handleDelete() { handleDeleteRequest(id); };
    }
    return [
    {
      key: "name",
      header: "Name",
      cell: (policy) => <span className="text-dense font-medium">{policy.name}</span>,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (policy) => policy.priority ? (
        <Badge
          variant="outline"
          className={cn("text-[9px] h-4 px-1.5 py-0 capitalize", PRIORITY_BADGE[policy.priority])}
        >
          {policy.priority}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-dense">Any</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (policy) => <span className="text-dense">{policy.category ?? "—"}</span>,
    },
    {
      key: "businessHours",
      header: "Business Hours",
      cell: (policy) => (
        <span className="text-dense">
          {policy.businessHoursId !== null ? (businessHoursNameById.get(policy.businessHoursId) ?? "24/7") : "24/7"}
        </span>
      ),
    },
    {
      key: "firstResponse",
      header: "First Response",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (policy) => <span className="text-dense font-mono tabular-nums">{policy.firstResponseTargetMins}m</span>,
    },
    {
      key: "resolution",
      header: "Resolution",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (policy) => <span className="text-dense font-mono tabular-nums">{policy.resolutionTargetMins}m</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (policy) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] h-4 px-1.5 py-0",
            policy.isEnabled
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          {policy.isEnabled ? "Enabled" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (policy) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="w-7" onClick={makeEditHandler(policy)} aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AnimatedIconButton variant="ghost" size="icon" className="w-7 text-destructive" onClick={makeDeleteHandler(policy.id)} aria-label="Delete" icon={Trash2Icon} />
        </div>
      ),
    },
    ];
  }, [businessHoursNameById, handleStartEdit, handleDeleteRequest]);

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SLA Policy</AlertDialogTitle>
            <AlertDialogDescription>
              This policy will be permanently deleted. Tickets will no longer be tracked against it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageWrapper
        title="SLA Policies"
        subtitle={isLoading ? undefined : `${count} polic${count !== 1 ? "ies" : "y"}`}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5">
                New Policy
              </AnimatedIconButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create SLA Policy</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <PolicyFormFields form={createForm} businessHoursOptions={businessHoursOptions} idPrefix="create" />
                  <LoadingButton type="submit" className="w-full" isPending={createPolicy.isPending} loadingText="Creating…">
                    Create Policy
                  </LoadingButton>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      >
        {isError ? (
          <EmptyState
            illustrationPreset="security"
            title="Failed to load SLA policies"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            <StatCardGrid cols={2}>
              <StatCard label="Total Policies" value={count} icon={Shield} tone="blue" />
              <StatCard label="Enabled" value={enabledCount} icon={Shield} tone="emerald" />
            </StatCardGrid>

            <DataTable
              data={policies ?? []}
              columns={columns}
              getRowKey={(policy) => policy.id}
              isLoading={isLoading}
              className="flex-1 min-h-0"
              emptyState={
                <div className="py-14 px-4">
                  <EmptyState
                    illustrationPreset="security"
                    title="No SLA policies defined"
                    description="Create a policy to track response and resolution time commitments for tickets."
                    action={{ label: "New Policy", onClick: handleOpenCreate }}
                    className="border-0 bg-transparent"
                  />
                </div>
              }
            />

            {editingId !== null && (
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Edit Policy</p>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                      <PolicyFormFields form={editForm} businessHoursOptions={businessHoursOptions} idPrefix="edit" />
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                        <LoadingButton type="submit" isPending={updatePolicy.isPending} loadingText="Saving…">
                          Save Changes
                        </LoadingButton>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            )}
          </div>
        )}
      </PageWrapper>
    </>
  );
}
