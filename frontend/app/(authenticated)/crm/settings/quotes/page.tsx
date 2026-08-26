"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { QuoteTemplateSheet } from "@/features/crm/settings/quotes/quote-template-sheet";
import {
  QuoteSettingsForm,
  type QuoteSettingsFormValues,
} from "@/features/crm/settings/quotes/quote-settings-form";
import { useCan } from "@/hooks/api/access";
import {
  useDeleteQuoteTemplate,
  useQuoteSettings,
  useQuoteTemplates,
  useUpdateQuoteSettings,
} from "@/hooks/api/crm/pricebooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { QUOTE_TEMPLATE_LAYOUT } from "@/lib/renderer/crm/settings/quote-template-layout";
import type { QuoteTemplate } from "@/types/crm/pricebooks";

/**
 * Quoting rules, and the documents quotes are rendered into.
 *
 * The template list is generated. The settings form above it is not, and cannot
 * be: quote settings are a singleton, and a `RecordLayout` has to declare list
 * columns with a primary among them. There is no list of one settings record, so
 * describing it would mean inventing a table nobody will ever see.
 */
export default function QuoteSettingsPage() {
  const layout = useTenantLayout(QUOTE_TEMPLATE_LAYOUT);
  const canManage = useCan("crm:pricebooks:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QuoteTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuoteTemplate | null>(null);

  const settings = useQuoteSettings();
  const updateSettings = useUpdateQuoteSettings();
  const {
    data,
    isLoading: templatesLoading,
    isError: templatesError,
    refetch,
  } = useQuoteTemplates();
  const deleteTemplate = useDeleteQuoteTemplate();

  const templates = useMemo(() => data ?? [], [data]);

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
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateSettings],
  );

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteTemplate.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteTarget(null);
      },
    });
  }, [deleteTemplate, deleteTarget]);

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const template = templates.find((candidate) => candidate.id === row.id);
      if (!template || !canManage) return null;
      return (
        <RecordRowActions
          editLabel={`Edit ${template.name}`}
          deleteLabel={`Delete ${template.name}`}
          onEdit={() => {
            setEditTarget(template);
            setSheetOpen(true);
          }}
          onDelete={() => setDeleteTarget(template)}
        />
      );
    },
    [templates, canManage],
  );

  return (
    <PageWrapper
      title="Quoting"
      subtitle="How long a quote stands, how far a price may bend, and what the document looks like."
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New template
          </AnimatedIconButton>
        ) : undefined
      }
    >
      {!canManage ? (
        <NoPermissionState
          permission="crm:pricebooks:manage"
          className="flex-1"
          description="Quoting rules are set by your sales operations team."
        />
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-section">
          <section className={`${CONTENT_PANEL_SOLID} shrink-0 p-card-pad`}>
            <h2 className="mb-3 text-sm font-semibold">Rules</h2>
            {settings.isLoading ? (
              <div className="flex flex-col gap-gap-toolbar">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : settings.isError ? (
              <ErrorState
                compact
                title="Couldn't load quote settings"
                description="The settings didn't load. Check your connection and try again."
                onRetry={() => void settings.refetch()}
              />
            ) : (
              <QuoteSettingsForm
                settings={settings.data}
                onSubmit={handleSettingsSubmit}
                isPending={updateSettings.isPending}
              />
            )}
          </section>

          <section className="flex min-h-0 flex-1 flex-col gap-gap-toolbar">
            <h2 className="shrink-0 text-sm font-semibold">Templates</h2>
            {templatesLoading ? (
              <DataTableSkeleton
                rows={6}
                columns={layout.list.columns.length}
                className="flex-1"
              />
            ) : templatesError ? (
              <ErrorState
                title="Couldn't load quote templates"
                description="The template list didn't load. Check your connection and try again."
                onRetry={handleRetry}
                className="flex-1"
              />
            ) : templates.length === 0 ? (
              <EmptyState
                compact
                illustrationPreset="documents"
                title="No templates yet"
                description="A template is the document a quote is rendered into — your letterhead, your terms, your layout."
                action={{ label: "New template", onClick: handleOpenCreate }}
                className="flex-1"
              />
            ) : (
              <RecordList
                layout={layout}
                rows={asRecordValues(templates)}
                getRowKey={(row) => String(row.id)}
                actions={rowActions}
                density="compact"
                minWidth="720px"
                className="flex-1 min-h-0"
              />
            )}
          </section>
        </div>
      )}

      <QuoteTemplateSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        template={editTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this template?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be permanently deleted. Quotes already made from it keep the document they were rendered into. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete template"
        destructive
        isPending={deleteTemplate.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
