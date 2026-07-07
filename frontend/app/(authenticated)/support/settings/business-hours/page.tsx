"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useBusinessHoursList, useCreateBusinessHours, useUpdateBusinessHours, useDeleteBusinessHours,
  type BusinessHours,
} from "@/hooks/api/support/business-hours";
import { toast } from "sonner";
import {
  businessHoursSchema, DEFAULT_FORM_VALUES, businessHoursToFormValues, buildMutationPayload,
  type BusinessHoursForm,
} from "@/features/support/settings/business-hours-form.schema";
import { BusinessHoursSheet } from "@/features/support/settings/business-hours-sheet";
import { BusinessHoursTableRow } from "@/features/support/settings/business-hours-table-row";

export default function BusinessHoursPage() {
  const { data: businessHoursList, isLoading, isError, refetch } = useBusinessHoursList();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBh, setEditingBh] = useState<BusinessHours | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createBusinessHours = useCreateBusinessHours();
  const updateBusinessHours = useUpdateBusinessHours();
  const deleteBusinessHours = useDeleteBusinessHours();

  const createForm = useForm<BusinessHoursForm>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const editForm = useForm<BusinessHoursForm>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const handleOpenCreate = useCallback(() => {
    createForm.reset(DEFAULT_FORM_VALUES);
    setCreateOpen(true);
  }, [createForm]);

  const onCreateSubmit = useCallback((data: BusinessHoursForm) => {
    createBusinessHours.mutate(buildMutationPayload(data), {
      onSuccess: () => { toast.success("Business hours created"); setCreateOpen(false); },
      onError: (err) => toast.error(err.message),
    });
  }, [createBusinessHours]);

  const handleStartEdit = useCallback((bh: BusinessHours) => {
    editForm.reset(businessHoursToFormValues(bh));
    setEditingBh(bh);
  }, [editForm]);

  const onEditSubmit = useCallback((data: BusinessHoursForm) => {
    if (!editingBh) return;
    updateBusinessHours.mutate(
      { id: editingBh.id, ...buildMutationPayload(data) },
      {
        onSuccess: () => { toast.success("Business hours updated"); setEditingBh(null); },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [editingBh, updateBusinessHours]);

  const handleEditOpenChange = useCallback((open: boolean) => { if (!open) setEditingBh(null); }, []);
  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);
  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) handleDeleteCancel(); }, [handleDeleteCancel]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteBusinessHours.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Business hours deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(err.message); setDeleteTargetId(null); },
    });
  }, [deleteBusinessHours, deleteTargetId]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const count = businessHoursList?.length ?? 0;

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Hours</AlertDialogTitle>
            <AlertDialogDescription>
              This calendar will be permanently deleted. SLA policies referencing it will fall back to 24/7 tracking.
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

      <BusinessHoursSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        form={createForm}
        onSubmit={onCreateSubmit}
        isPending={createBusinessHours.isPending}
      />

      {editingBh && (
        <BusinessHoursSheet
          open={editingBh !== null}
          onOpenChange={handleEditOpenChange}
          mode="edit"
          form={editForm}
          onSubmit={onEditSubmit}
          isPending={updateBusinessHours.isPending}
        />
      )}

      <PageWrapper
        title="Business Hours"
        subtitle={isLoading ? undefined : `${count} calendar${count !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Calendar
          </Button>
        }
      >
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <EmptyState
            illustrationPreset="settings"
            title="Failed to load business hours"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : (
          <Card className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-semibold">Calendars</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {businessHoursList && businessHoursList.length > 0 ? (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    <TableRow className="border-b-2 border-border hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Timezone</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Coverage</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Default</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessHoursList.map((bh) => (
                      <BusinessHoursTableRow
                        key={bh.id}
                        bh={bh}
                        onEdit={handleStartEdit}
                        onDeleteRequest={handleDeleteRequest}
                      />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-14 px-4">
                  <EmptyState
                    illustrationPreset="settings"
                    title="No business hours calendars defined"
                    description="Create a calendar to scope SLA targets to your team's working hours."
                    action={{ label: "New Calendar", onClick: handleOpenCreate }}
                    className="border-0 bg-transparent"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </PageWrapper>
    </>
  );
}
