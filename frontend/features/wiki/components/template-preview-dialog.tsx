"use client";

import { AppDialog } from "@/components/shared/app-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import type { StarterTemplate } from "@/features/wiki/lib/starter-templates";

interface TemplatePreviewDialogProps {
  template: StarterTemplate;
  onOpenChange: (open: boolean) => void;
  onUse: (template: StarterTemplate) => void;
  isPending: boolean;
}

function blockText(children: Array<{ text: string }>): string {
  return children.map((c) => c.text).join("");
}

export function TemplatePreviewDialog({
  template,
  onOpenChange,
  onUse,
  isPending,
}: TemplatePreviewDialogProps) {
  function handleUse() {
    onUse(template);
  }

  return (
    <AppDialog
      open
      onOpenChange={onOpenChange}
      title={`${template.icon} ${template.name}`}
      description={template.category}
      className="max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <LoadingButton onClick={handleUse} isPending={isPending}>
            Use this template
          </LoadingButton>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{template.expectedOutput}</p>
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
          {template.content.children.map((block, index) => {
            const text = blockText(block.children);
            if (block.type === "h1")
              return (
                <p key={index} className="text-sm font-semibold text-foreground">
                  {text || "Untitled"}
                </p>
              );
            if (block.type === "h2" || block.type === "h3")
              return (
                <p key={index} className="text-xs font-medium text-foreground pt-1.5">
                  {text}
                </p>
              );
            if (block.type === "blockquote")
              return (
                <p key={index} className="text-xs italic text-muted-foreground">
                  {text}
                </p>
              );
            return text ? (
              <p key={index} className="text-xs text-muted-foreground line-clamp-1">
                {text}
              </p>
            ) : null;
          })}
        </div>
      </div>
    </AppDialog>
  );
}
