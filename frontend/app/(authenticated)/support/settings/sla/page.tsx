"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form } from "@/components/ui/form";
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useSlaPoliciesList, useCreateSlaPolicy, useUpdateSlaPolicy, useDeleteSlaPolicy,
  type SlaPolicy,
} from "@/hooks/api/support/sla-policies";
import { useBusinessHoursList } from "@/hooks/api/support/business-hours";
import { toast } from "sonner";
import {
  policySchema, DEFAULT_FORM_VALUES, policyToFormValues, buildCreatePayload, buildUpdatePayload,
  type PolicyForm,
} from "@/features/support/settings/sla-policy-form.schema";
import { PolicyFormFields, type BusinessHoursOption } from "@/features/support/settings/sla-policy-form-fields";
import { SlaTableRow } from "@/features/support/settings/sla-policy-table-row";

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
      onError: (err) => toast.error(err.message),
    });
  }, [createPolicy, createForm]);

  const onEditSubmit = useCallback((data: PolicyForm) => {
    if (editingId === null) return;
    updatePolicy.mutate(
      { id: editingId, ...buildUpdatePayload(data) },
      {
        onSuccess: () => { toast.success("Policy updated"); setEditingId(null); },
        onError: (err) => toast.error(err.message),
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
      onError: (err) => { toast.error(err.message); setDeleteTargetId(null); },
    });
  }, [deletePolicy, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) handleDeleteCancel(); }, [handleDeleteCancel]);

  const count = policies?.length ?? 0;
  const enabledCount = policies?.filter((p) => p.isEnabled).length ?? 0;

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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create SLA Policy</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <PolicyFormFields form={createForm} businessHoursOptions={businessHoursOptions} idPrefix="create" />
                  <Button type="submit" className="w-full" disabled={createPolicy.isPending}>
                    {createPolicy.isPending ? "Creating..." : "Create Policy"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      >
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-2">
              {[0, 1].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : isError ? (
          <EmptyState
            illustrationPreset="security"
            title="Failed to load SLA policies"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-6">
            <StatCardGrid cols={2}>
              <StatCard label="Total Policies" value={count} icon={Shield} tone="blue" />
              <StatCard label="Enabled" value={enabledCount} icon={Shield} tone="emerald" />
            </StatCardGrid>

            <Card className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm font-semibold">Policies</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {policies && policies.length > 0 ? (
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <TableRow className="border-b-2 border-border hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Priority</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Category</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Business Hours</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">First Response</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Resolution</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map(policy => (
                        <SlaTableRow
                          key={policy.id}
                          policy={policy}
                          businessHoursName={policy.businessHoursId !== null ? businessHoursNameById.get(policy.businessHoursId) ?? null : null}
                          onEdit={handleStartEdit}
                          onDeleteRequest={handleDeleteRequest}
                        />
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-14 px-4">
                    <EmptyState
                      illustrationPreset="security"
                      title="No SLA policies defined"
                      description="Create a policy to track response and resolution time commitments for tickets."
                      action={{ label: "New Policy", onClick: handleOpenCreate }}
                      className="border-0 bg-transparent"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {editingId !== null && (
              <Card className="bg-card rounded-lg border border-border shadow-sm">
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-sm font-semibold">Edit Policy</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                      <PolicyFormFields form={editForm} businessHoursOptions={businessHoursOptions} idPrefix="edit" />
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                        <Button type="submit" disabled={updatePolicy.isPending}>
                          {updatePolicy.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageWrapper>
    </>
  );
}
