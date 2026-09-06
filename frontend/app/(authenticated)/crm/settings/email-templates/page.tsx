"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { EyeIcon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { EmailTemplateSheet } from "@/features/crm/settings/email-templates/email-template-sheet";
import { EmailTemplatePreviewSheet } from "@/features/crm/settings/email-templates/email-template-preview-sheet";
import { useCan } from "@/hooks/api/access";
import {
  useDeleteEmailTemplate,
  useEmailTemplates,
  type EmailTemplate,
} from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { EMAIL_TEMPLATE_LAYOUT } from "@/lib/renderer/crm/settings/email-template-layout";

/**
 * Email templates.
 *
 * A table rather than a grid of cards. A template is identified by its name and
 * distinguished by its subject, both of which are one line — a card grid spent
 * three columns of a wide screen showing nine of them where a table shows
 * twenty-five, and the body preview it added was three clipped lines nobody can
 * read anyway. The preview that is worth having is the one with the variables
 * filled in, and that is a row action.
 */
export default function EmailTemplatesPage() {
  const layout = useTenantLayout(EMAIL_TEMPLATE_LAYOUT);
  const [density, setDensity] = useDensity();
  const canManage = useCan("crm:email-templates:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmailTemplate | null>(null);
  const [previewTarget, setPreviewTarget] = useState<EmailTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  const { data, isLoading, isError, refetch, access} = useEmailTemplates({ limit: 50, offset: 0 });
  const deleteTemplate = useDeleteEmailTemplate();

  const templates = useMemo(() => data ?? [], [data]);

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handlePreviewOpenChange = useCallback((open: boolean) => {
    if (!open) setPreviewTarget(null);
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

  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => {
      const template = templates.find((candidate) => candidate.id === row.id);
      if (template) setPreviewTarget(template);
    },
    [templates],
  );

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const template = templates.find((candidate) => candidate.id === row.id);
      if (!template) return null;
      return (
        <RecordRowActions
          editLabel={`Edit ${template.name}`}
          deleteLabel={`Delete ${template.name}`}
          leading={
            <AnimatedIconButton
              icon={EyeIcon}
              iconSize={14}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Preview ${template.name}`}
              onClick={() => setPreviewTarget(template)}
            />
          }
          onEdit={canManage ? () => {
            setEditTarget(template);
            setSheetOpen(true);
          } : undefined}
          onDelete={canManage ? () => setDeleteTarget(template) : undefined}
        />
      );
    },
    [templates, canManage],
  );

  return (
    <PageWrapper
      title="Email templates"
      subtitle="An email written once, with the parts that change left as variables."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!canManage ? (
          <NoPermissionState
            permission="crm:email-templates:manage"
            className={CONTENT_FILL_PANEL}
            description="Outreach templates are managed by your sales operations team."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={10} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load templates"
            description="The template list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : templates.length === 0 ? (
          <EmptyState
            access={access}
            illustration={<EmptyMailIllustration />}
            title="No templates yet"
            description="Write the email once and leave the name, the company and the amount as variables — the rest fills itself in."
            action={{ label: "New template", onClick: handleOpenCreate }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={asRecordValues(templates)}
            getRowKey={(row) => String(row.id)}
            onRowClick={handleRowClick}
            actions={rowActions}
            density={density}
            minWidth="720px"
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <EmailTemplateSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        template={editTarget}
      />

      <EmailTemplatePreviewSheet
        template={previewTarget}
        onOpenChange={handlePreviewOpenChange}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this template?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be permanently deleted. Emails already sent from it are unaffected. This cannot be undone.`
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
