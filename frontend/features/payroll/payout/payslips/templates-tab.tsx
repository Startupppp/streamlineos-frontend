"use client";

import { useState } from "react";
import { Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EyeIcon, Trash2Icon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { usePayslipTemplates } from "@/hooks/api/payroll";
import type { PayslipLayout, PayslipTemplate } from "@/types/payroll";
import { TemplateEditSheet } from "./template-edit-sheet";
import { PayslipPreviewSheet } from "./template-preview-sheet";
import { TemplateDeleteDialog } from "./template-delete-dialog";

const LAYOUT_BADGE: Record<PayslipLayout, string> = {
  CLASSIC: "bg-status-info-surface text-status-info-ink border border-status-info-rule",
  MODERN: "bg-status-info-surface text-status-info-ink border border-status-info-rule",
  COMPLIANCE: "bg-muted text-muted-foreground border border-border",
};

function TemplateCard({
  template,
  canManage,
  onPreview,
  onEdit,
  onDelete,
}: {
  template: PayslipTemplate;
  canManage: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded-md text-micro font-semibold uppercase tracking-wider",
            LAYOUT_BADGE[template.layout],
          )}
        >
          {template.layout}
        </span>
        {template.isDefault && (
          <span className="inline-flex items-center gap-0.5 text-status-success-ink text-micro font-medium">
            <Star className="h-3 w-3" />
            Default
          </span>
        )}
      </div>
      <TruncatedText text={template.name} className="font-semibold text-sm text-foreground" />
      <div className="flex items-center gap-2">
        <div
          className="h-4 w-4 rounded-full border border-border"
          style={{ backgroundColor: template.config.accent }}
        />
        <span className="text-dense text-muted-foreground">Accent</span>
      </div>
      <div className="space-y-0.5">
        <p className="text-dense text-muted-foreground">
          Employer contributions: {template.config.showEmployerContributions ? "yes" : "no"}
        </p>
        <p className="text-dense text-muted-foreground">
          YTD: {template.config.showYtd ? "yes" : "no"}
        </p>
      </div>
      {canManage && (
        <div className="flex items-center gap-1.5 pt-1">
          <AnimatedIconButton icon={EyeIcon} iconClassName="mr-1.5" variant="outline" size="sm" className="text-xs" onClick={onPreview}>
            Preview
          </AnimatedIconButton>
          <Button variant="outline" size="sm" className="text-xs" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          {!template.isDefault && (
            <AnimatedIconButton
              icon={Trash2Icon}
              iconClassName="mr-1.5"
              variant="outline"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              Delete
            </AnimatedIconButton>
          )}
        </div>
      )}
    </div>
  );
}

interface TemplatesTabProps {
  canManage: boolean;
}

export function TemplatesTab({ canManage }: TemplatesTabProps) {
  const { data: templates, isLoading, isError, error, refetch } = usePayslipTemplates();
  const [previewTarget, setPreviewTarget] = useState<PayslipTemplate | null>(null);
  const [editTarget, setEditTarget] = useState<PayslipTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayslipTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  function handlePreview(template: PayslipTemplate) {
    setPreviewTarget(template);
  }

  function handleEdit(template: PayslipTemplate) {
    setEditTarget(template);
  }

  function handleDelete(template: PayslipTemplate) {
    setDeleteTarget(template);
  }

  function handleClosePreview() {
    setPreviewTarget(null);
  }

  function handleCloseEdit() {
    setEditTarget(null);
  }

  function handleCloseDelete() {
    setDeleteTarget(null);
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Payslip Templates</p>
        {canManage && (
          <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" size="sm" onClick={handleOpenCreate}>
            Create Template
          </AnimatedIconButton>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      )}

      {/* A failed read is not "no templates found — create one to get started". */}
      {!isLoading && isError && (
        <ErrorState
          className="flex-1"
          title="Couldn't load payslip templates"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !isError && (!templates || templates.length === 0) && (
        <EmptyState
          illustrationPreset="documents"
          title="No templates found"
          description="Create a payslip template to get started."
        />
      )}

      {!isLoading && !isError && templates && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              canManage={canManage}
              onPreview={() => handlePreview(t)}
              onEdit={() => handleEdit(t)}
              onDelete={() => handleDelete(t)}
            />
          ))}
        </div>
      )}

      {previewTarget && (
        <PayslipPreviewSheet
          template={previewTarget}
          open={previewTarget !== null}
          onOpenChange={(open) => { if (!open) handleClosePreview(); }}
        />
      )}

      {editTarget && (
        <TemplateEditSheet
          open={editTarget !== null}
          onOpenChange={(open) => { if (!open) handleCloseEdit(); }}
          template={editTarget}
        />
      )}

      <TemplateEditSheet open={createOpen} onOpenChange={setCreateOpen} />

      {deleteTarget && (
        <TemplateDeleteDialog
          template={deleteTarget}
          open={deleteTarget !== null}
          onOpenChange={(open) => { if (!open) handleCloseDelete(); }}
        />
      )}
    </div>
  );
}
