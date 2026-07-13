"use client";

import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useQuoteSettings,
  useUpdateQuoteSettings,
  useQuoteTemplates,
  useCreateQuoteTemplate,
  useUpdateQuoteTemplate,
  useDeleteQuoteTemplate,
} from "@/hooks/api/crm/pricebooks";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  QuoteSettingsForm,
  type QuoteSettingsFormValues,
} from "@/features/crm/settings/quotes/quote-settings-form";
import {
  QuoteTemplateFormSheet,
  type QuoteTemplateFormValues,
  defaultTemplateValues,
  templateValuesFromTemplate,
} from "@/features/crm/settings/quotes/quote-template-form";
import type { QuoteTemplate } from "@/types/crm/pricebooks";

function SettingsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="flex justify-end">
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

export default function QuoteSettingsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QuoteTemplate | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: settings, isLoading: settingsLoading } = useQuoteSettings();
  const updateSettings = useUpdateQuoteSettings();

  const { data: templates, isLoading: templatesLoading } = useQuoteTemplates();
  const createTemplate = useCreateQuoteTemplate();
  const updateTemplate = useUpdateQuoteTemplate();
  const deleteTemplate = useDeleteQuoteTemplate();

  const handleSettingsSubmit = useCallback(
    (values: QuoteSettingsFormValues) => {
      updateSettings.mutate(
        {
          maxDiscountPercent: values.maxDiscountPercent ?? null,
          requirePricebookPrice: values.requirePricebookPrice,
          defaultExpiryDays: values.defaultExpiryDays,
          allowPriceOverride: values.allowPriceOverride,
        },
        {
          onSuccess: () => toast.success("Quote settings saved"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [updateSettings],
  );

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((template: QuoteTemplate) => {
    setEditTarget(template);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleTemplateSubmit = useCallback(
    (values: QuoteTemplateFormValues) => {
      const payload = {
        name: values.name,
        isDefault: values.isDefault,
        terms: values.terms || undefined,
      };

      if (editTarget) {
        updateTemplate.mutate(
          { id: editTarget.id, ...payload },
          {
            onSuccess: () => {
              toast.success("Template updated");
              setSheetOpen(false);
              setEditTarget(null);
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        createTemplate.mutate(payload, {
          onSuccess: () => {
            toast.success("Template created");
            setSheetOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [editTarget, updateTemplate, createTemplate],
  );

  const handleDeleteRequest = useCallback((id: string) => setDeleteTargetId(id), []);
  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTargetId(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteTemplate.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteTargetId(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setDeleteTargetId(null);
      },
    });
  }, [deleteTemplate, deleteTargetId]);

  const handleEditRow = useCallback(
    (template: QuoteTemplate) => handleOpenEdit(template),
    [handleOpenEdit],
  );

  const handleDeleteRow = useCallback(
    (id: string) => handleDeleteRequest(id),
    [handleDeleteRequest],
  );

  const allTemplates = templates ?? [];
  const templateFormValues = editTarget
    ? templateValuesFromTemplate(editTarget)
    : defaultTemplateValues;

  const columns: DataTableColumn<QuoteTemplate>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (t) => t.name,
      cell: (t) => <span className="font-medium text-sm">{t.name}</span>,
    },
    {
      key: "isDefault",
      header: "Default",
      cell: (t) =>
        t.isDefault ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30">
            Default
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "terms",
      header: "Terms & Conditions",
      cell: (t) =>
        t.terms ? (
          <span className="text-xs text-muted-foreground truncate max-w-[300px] block">
            {t.terms}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditRow(t)}
            aria-label="Edit template"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteRow(t.id)}
            className="text-destructive hover:text-destructive"
            aria-label="Delete template"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const isTemplatePending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              This template will be permanently deleted and cannot be recovered.
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

      <QuoteTemplateFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        editTarget={editTarget}
        onSubmit={handleTemplateSubmit}
        isPending={isTemplatePending}
        initialValues={templateFormValues}
      />

      <PageWrapper
        title="Quote Settings"
        subtitle="Configure quoting behavior and document templates"
      >
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">General Settings</h2>
          {settingsLoading ? (
            <SettingsSkeleton />
          ) : (
            <QuoteSettingsForm
              settings={settings}
              onSubmit={handleSettingsSubmit}
              isPending={updateSettings.isPending}
            />
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Quote Templates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reusable document templates for generating quotes
              </p>
            </div>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Template
            </Button>
          </div>
          <DataTable
            data={allTemplates}
            columns={columns}
            getRowKey={(t) => t.id}
            isLoading={templatesLoading}
            emptyState={
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm font-medium text-foreground">No templates yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Create a template to use when generating quote documents.
                </p>
                <Button size="sm" variant="outline" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Template
                </Button>
              </div>
            }
          />
        </div>
      </PageWrapper>
    </>
  );
}
