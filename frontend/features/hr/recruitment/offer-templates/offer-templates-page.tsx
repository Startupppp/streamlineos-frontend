"use client";

import { useState, useCallback } from "react";
import { useOfferTemplates, useCreateOfferTemplate, useUpdateOfferTemplate, useDeleteOfferTemplate, useGenerateOfferPdf } from "@/hooks/api/hr/recruitment/offer-templates";
import type { OfferLetterTemplate } from "@/hooks/api/hr/recruitment/offer-templates";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SanitizedHtml } from "@/components/shared/sanitized-html";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { PlusIcon, TrashIcon, DownloadIcon } from "@animateicons/react/lucide";
import { ErrorState } from "@/components/shared/error-state";

const DEFAULT_TEMPLATE = `<h1>Offer Letter</h1>
<p>Date: {{joining_date}}</p>
<br/>
<p>Dear {{candidate_name}},</p>
<p>We are delighted to offer you the position of <strong>{{designation}}</strong> at <strong>{{org_name}}</strong>.</p>
<h2>Compensation Details</h2>
<ul>
  <li>Annual CTC: {{salary}}</li>
  <li>Start Date: {{joining_date}}</li>
</ul>
<p>Please confirm your acceptance by <strong>{{valid_until}}</strong>.</p>
<p>We look forward to welcoming you to the team!</p>
<br/>
<p>Warm regards,<br/><strong>HR Team — {{org_name}}</strong></p>`;

interface TemplateSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: OfferLetterTemplate;
}

function TemplateSheet({ open, onOpenChange, template }: TemplateSheetProps) {
  const isEdit = !!template;
  const createMutation = useCreateOfferTemplate();
  const updateMutation = useUpdateOfferTemplate(template?.id ?? 0);

  const [name, setName] = useState(template?.name ?? "");
  const [htmlContent, setHtmlContent] = useState(
    template?.htmlContent ?? DEFAULT_TEMPLATE,
  );
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);

  const handleOpen = useCallback(
    (v: boolean) => {
      if (!v) {
        setName(template?.name ?? "");
        setHtmlContent(template?.htmlContent ?? DEFAULT_TEMPLATE);
        setIsDefault(template?.isDefault ?? false);
      }
      onOpenChange(v);
    },
    [template, onOpenChange],
  );

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!htmlContent.trim()) {
      toast.error("Template content is required");
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          name: name.trim(),
          htmlContent,
          isDefault,
        });
        toast.success("Template updated");
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          htmlContent,
          isDefault,
        });
        toast.success("Template created");
      }
      handleOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [
    name,
    htmlContent,
    isDefault,
    isEdit,
    updateMutation,
    createMutation,
    handleOpen,
  ]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }
  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setHtmlContent(e.target.value);
  }
  function handleCancelSheet() {
    handleOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>
            {isEdit ? "Edit Template" : "New Offer Letter Template"}
          </SheetTitle>
          <SheetDescription>
            Use placeholders: {"{{candidate_name}}"}, {"{{designation}}"},{" "}
            {"{{salary}}"}, {"{{joining_date}}"}, {"{{valid_until}}"},{" "}
            {"{{org_name}}"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Template Name</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Standard Offer Letter"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Content (HTML)</Label>
            <Textarea
              value={htmlContent}
              onChange={handleContentChange}
              rows={18}
              className="font-mono text-xs"
              placeholder="Enter HTML content with placeholders..."
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="tpl-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            <Label htmlFor="tpl-default" className="cursor-pointer">
              Set as default template
            </Label>
          </div>
        </SheetBody>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleCancelSheet}
            disabled={isPending}
          >
            Cancel
          </Button>
          <LoadingButton onClick={handleSubmit} isPending={isPending} loadingText="Saving...">
            {isEdit ? "Save Changes" : "Create Template"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface PreviewSheetProps {
  template: OfferLetterTemplate;
  onClose: () => void;
}

function PreviewSheet({ template, onClose }: PreviewSheetProps) {
  const generatePdf = useGenerateOfferPdf();
  const preview = template.htmlContent
    .replace(/\{\{candidate_name\}\}/g, "Jane Doe")
    .replace(/\{\{designation\}\}/g, "Senior Engineer")
    .replace(/\{\{salary\}\}/g, "₹15,00,000")
    .replace(/\{\{joining_date\}\}/g, "July 1, 2026")
    .replace(/\{\{valid_until\}\}/g, "June 30, 2026")
    .replace(/\{\{org_name\}\}/g, "Acme Corp");

  const handleDownloadPdf = async () => {
    try {
      const result = await generatePdf.mutateAsync({
        templateId: template.id,
        candidateName: "Jane Doe",
        designation: "Senior Engineer",
        salary: "₹15,00,000",
        joiningDate: "July 1, 2026",
        validUntil: "June 30, 2026",
        orgName: "Acme Corp",
      });
      const link = document.createElement("a");
      link.href = `data:${result.mimeType};base64,${result.base64}`;
      link.download = result.fileName;
      link.click();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  function handleSheetOpenChange(v: boolean) {
    if (!v) onClose();
  }

  return (
    <Sheet open onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Preview — {template.name}</SheetTitle>
          <SheetDescription>
            Sample data applied. Actual values will be filled at generation
            time.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          <SanitizedHtml
            html={preview}
            className="prose prose-sm max-w-none border rounded-lg p-4 bg-card text-foreground"
          />
        </SheetBody>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <LoadingButton onClick={handleDownloadPdf} isPending={generatePdf.isPending} loadingText="Generating...">
            <DownloadIcon size={14} />
            Download Sample PDF
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface TemplateCardProps {
  template: OfferLetterTemplate;
  onPreview: (t: OfferLetterTemplate) => void;
  onEdit: (t: OfferLetterTemplate) => void;
  onDelete: (id: number) => void;
}

function TemplateCard({ template, onPreview, onEdit, onDelete }: TemplateCardProps) {
  function handlePreview() { onPreview(template); }
  function handleEdit() { onEdit(template); }
  function handleDelete() { onDelete(template.id); }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{template.name}</span>
              {template.isDefault && (
                <Badge variant="default" className="text-xs">Default</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              {template.creator && <span>by {template.creator.name}</span>}
              <span>{format(new Date(template.createdAt), "MMM d, yyyy")}</span>
              <span>{template.htmlContent.length.toLocaleString()} chars</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="px-2 text-xs" onClick={handlePreview}>
              Preview
            </Button>
            <TooltipIconButton label="Edit template" variant="ghost" size="sm" className="w-8" onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
            </TooltipIconButton>
            <TooltipIconButton
              icon={TrashIcon}
              label="Delete template"
              variant="ghost"
              size="sm"
              className="w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OfferTemplatesPage() {
  const { data: templates = [], isLoading, isError, refetch } = useOfferTemplates();
  const deleteMutation = useDeleteOfferTemplate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<OfferLetterTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] =
    useState<OfferLetterTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Template deleted");
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        setDeletingId(null);
      }
    },
    [deleteMutation],
  );

  function handleOpenCreate() { setIsCreateOpen(true); }
  function handleCloseEditingTemplate(v: boolean) { if (!v) setEditingTemplate(null); }
  function handleClosePreviewTemplate() { setPreviewTemplate(null); }
  function handleCloseDeleteDialog(v: boolean) { if (!v) setDeletingId(null); }
  function handleConfirmDelete() { if (deletingId !== null) void handleDelete(deletingId); }

  const pageActions = (
    <AnimatedIconButton icon={PlusIcon} iconSize={14} size="sm" onClick={handleOpenCreate}>
      New Template
    </AnimatedIconButton>
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Offer Templates"
        subtitle="Reusable offer letter templates with placeholders."
        actions={pageActions}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Offer Templates"
        subtitle="Reusable offer letter templates with placeholders."
        actions={pageActions}
      >
        <ErrorState
          title="Unable to load offer templates"
          description="Try again. If this keeps happening, check your permissions or contact an admin."
          onRetry={() => void refetch()}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Offer Templates"
      subtitle="Create and manage reusable offer letter templates with dynamic placeholders."
      actions={pageActions}
    >
      {templates.length === 0 ? (
        <RecruitmentEmptyState
          illustration={<EmptyDocumentsIllustration />}
          title="No offer templates"
          description="Create a reusable offer letter template to speed up your hiring process."
          action={{
            label: "New Template",
            onClick: handleOpenCreate,
          }}
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={setPreviewTemplate}
              onEdit={setEditingTemplate}
              onDelete={setDeletingId}
            />
          ))}
        </div>
      )}

      <TemplateSheet open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {editingTemplate && (
        <TemplateSheet
          open={!!editingTemplate}
          onOpenChange={handleCloseEditingTemplate}
          template={editingTemplate}
        />
      )}

      {previewTemplate && (
        <PreviewSheet
          template={previewTemplate}
          onClose={handleClosePreviewTemplate}
        />
      )}

      <ConfirmSheet
        open={deletingId !== null}
        onOpenChange={handleCloseDeleteDialog}
        title="Delete Template"
        description="This will permanently delete this offer letter template."
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
