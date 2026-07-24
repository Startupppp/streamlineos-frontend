"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { EyeIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRenderHrTemplate } from "@/hooks/api/hr/hr-templates";
import type { HrTemplateListItem } from "@/types/hr/templates";

interface TemplatePreviewDialogProps {
  template: HrTemplateListItem;
}

export function TemplatePreviewDialog({ template }: TemplatePreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [outputHtml, setOutputHtml] = useState<string | null>(null);
  const render = useRenderHrTemplate();

  const handleRender = useCallback(() => {
    render.mutate(
      { templateId: template.id, includeSensitive: false },
      {
        onSuccess: (data) => setOutputHtml(data.outputHtml),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [template.id, render]);

  const handleOpenChange = useCallback(
    (val: boolean) => {
      setOpen(val);
      if (val && !outputHtml) handleRender();
    },
    [outputHtml, handleRender],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <AnimatedIconButton icon={EyeIcon} iconSize={14} iconClassName="mr-1" variant="outline" size="sm" className="gap-1.5">
          Preview
        </AnimatedIconButton>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{template.name} — Preview</DialogTitle>
        </DialogHeader>
        {render.isPending && (
          <div className="flex items-center justify-center py-12">
            <LoadingButton isPending loadingText="Rendering..." disabled />
          </div>
        )}
        {outputHtml && !render.isPending && (
          <iframe
            srcDoc={outputHtml}
            sandbox="allow-same-origin"
            className="w-full rounded-lg border min-h-[400px]"
            title="Template preview"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
