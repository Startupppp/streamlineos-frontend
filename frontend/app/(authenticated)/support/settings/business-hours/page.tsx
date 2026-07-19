"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useBusinessHoursList, useCreateBusinessHours, useUpdateBusinessHours, useDeleteBusinessHours,
  type BusinessHours,
} from "@/hooks/api/support/business-hours";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  businessHoursSchema, DEFAULT_FORM_VALUES, businessHoursToFormValues, buildMutationPayload,
  type BusinessHoursForm,
} from "@/features/support/settings/business-hours-form.schema";
import { BusinessHoursSheet } from "@/features/support/settings/business-hours-sheet";

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
      onError: (err) => toast.error(getApiError(err)),
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
        onError: (err) => toast.error(getApiError(err)),
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
      onError: (err) => { toast.error(getApiError(err)); setDeleteTargetId(null); },
    });
  }, [deleteBusinessHours, deleteTargetId]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const count = businessHoursList?.length ?? 0;

  function makeEditBhHandler(bh: BusinessHours) {
    return function handleEditBh() { handleStartEdit(bh); };
  }

  function makeDeleteBhHandler(id: number) {
    return function handleDeleteBh() { handleDeleteRequest(id); };
  }

  const columns = useMemo<DataTableColumn<BusinessHours>[]>(() => [
    {
      key: "name",
      header: "Name",
      cell: (bh) => <span className="text-[11px] font-medium">{bh.name}</span>,
    },
    {
      key: "timezone",
      header: "Timezone",
      cell: (bh) => <span className="text-[11px]">{bh.timezone}</span>,
    },
    {
      key: "coverage",
      header: "Coverage",
      cell: (bh) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] h-4 px-1.5 py-0",
            bh.is24x7 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" : "bg-muted text-muted-foreground border-border",
          )}
        >
          {bh.is24x7 ? "24/7" : "Scheduled"}
        </Badge>
      ),
    },
    {
      key: "isDefault",
      header: "Default",
      cell: (bh) => bh.isDefault ? (
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-primary/10 text-foreground border-primary/20">
          Default
        </Badge>
      ) : null,
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (bh) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="w-7" onClick={makeEditBhHandler(bh)} aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AnimatedIconButton variant="ghost" size="icon" className="w-7 text-destructive" onClick={makeDeleteBhHandler(bh.id)} aria-label="Delete" icon={Trash2Icon} />
        </div>
      ),
    },
  ], [handleStartEdit, handleDeleteRequest]);

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
          <AnimatedIconButton onClick={handleOpenCreate} icon={PlusIcon} iconClassName="mr-1.5">
            New Calendar
          </AnimatedIconButton>
        }
      >
        {isError ? (
          <EmptyState
            illustrationPreset="settings"
            title="Failed to load business hours"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <Card className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-sm font-semibold">Calendars</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={businessHoursList ?? []}
                columns={columns}
                getRowKey={(bh) => bh.id}
                isLoading={isLoading}
                emptyState={
                  <div className="py-14 px-4">
                    <EmptyState
                      illustrationPreset="settings"
                      title="No business hours calendars defined"
                      description="Create a calendar to scope SLA targets to your team's working hours."
                      action={{ label: "New Calendar", onClick: handleOpenCreate }}
                      className="border-0 bg-transparent"
                    />
                  </div>
                }
              />
            </CardContent>
          </Card>
        )}
      </PageWrapper>
    </>
  );
}
