"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateCard } from "@/features/payroll/shared";
import { TemplatePreviewSheet } from "@/features/payroll/setup/components/template-preview-sheet";
import { TemplateDuplicateDialog } from "@/features/payroll/setup/components/template-duplicate-dialog";
import { NavButtons } from "@/features/payroll/setup/nav-buttons";
import { usePayrollTemplates } from "@/hooks/api/payroll";
import type { SetupDraft } from "@/features/payroll/setup/lib/draft";
import type { TemplateRow } from "@/types/payroll/setup";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type StepTemplateProps = {
  draft: SetupDraft;
  updateDraft: (p: Partial<SetupDraft>) => void;
  goNext: () => void;
  goBack: () => void;
  preselectedKey?: string;
};

export function StepTemplate({
  draft,
  updateDraft,
  goNext,
  goBack,
  preselectedKey,
}: StepTemplateProps) {
  const { data, isLoading, isError } = usePayrollTemplates();
  const templates = data?.items ?? [];

  const [selectedKey, setSelectedKey] = useState<string | null>(
    draft.templateKey ?? preselectedKey ?? null,
  );
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRow | null>(null);
  const [duplicateTemplate, setDuplicateTemplate] = useState<TemplateRow | null>(null);

  function handleSelectTemplate(t: TemplateRow) {
    setSelectedKey(t.key);
  }

  function handlePreviewClose(open: boolean) {
    if (!open) setPreviewTemplate(null);
  }

  function handleDuplicateClose(open: boolean) {
    if (!open) setDuplicateTemplate(null);
  }

  function handleDuplicateSuccess(newTemplate: TemplateRow) {
    setSelectedKey(newTemplate.key);
  }

  function handleContinue() {
    if (!selectedKey) {
      toast.error("Please select a template to continue");
      return;
    }
    const selected = templates.find((t) => t.key === selectedKey);
    updateDraft({ templateKey: selectedKey, templateId: selected?.id });
    goNext();
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
        <NavButtons onBack={goBack} isLoading />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <p className="text-sm text-muted-foreground">Failed to load templates</p>
        </div>
        <NavButtons onBack={goBack} />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <p className="text-sm font-medium text-foreground">No templates available</p>
          <p className="text-xs text-muted-foreground">Contact your administrator to set up templates</p>
        </div>
        <NavButtons onBack={goBack} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={t.key === selectedKey}
            onSelect={() => handleSelectTemplate(t)}
            actions={
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={() => setPreviewTemplate(t)}
                >
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={() => setDuplicateTemplate(t)}
                >
                  Duplicate
                </Button>
              </>
            }
          />
        ))}
      </div>

      <NavButtons
        onBack={goBack}
        onNext={handleContinue}
        disableNext={!selectedKey}
      />

      <TemplatePreviewSheet
        template={previewTemplate}
        onOpenChange={handlePreviewClose}
      />
      <TemplateDuplicateDialog
        template={duplicateTemplate}
        onOpenChange={handleDuplicateClose}
        onSuccess={handleDuplicateSuccess}
      />
    </div>
  );
}
