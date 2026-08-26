"use client";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  EMAIL_TEMPLATE_VARIABLES,
} from "@/lib/renderer/crm/settings/email-template-layout";
import type { EmailTemplate } from "@/hooks/api/crm-settings";

/**
 * A template with its variables filled in.
 *
 * Not `RecordDetail`, and not by oversight: the detail view shows what is
 * stored, and what is stored here is `{{lead.name}}`. The reason somebody opens
 * a preview is to see what the recipient sees, which is a different thing from
 * the record.
 */

function interpolate(text: string): string {
  return EMAIL_TEMPLATE_VARIABLES.reduce(
    (result, variable) =>
      result.split(`{{${variable.token}}}`).join(variable.sample),
    text,
  );
}

interface EmailTemplatePreviewSheetProps {
  template: EmailTemplate | null;
  onOpenChange: (open: boolean) => void;
}

export function EmailTemplatePreviewSheet({
  template,
  onOpenChange,
}: EmailTemplatePreviewSheetProps) {
  return (
    <Sheet open={template !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{template ? template.name : "Preview"}</SheetTitle>
          <SheetDescription>
            Shown with sample values in place of every variable.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-gap-toolbar px-6 py-5">
          {template ? (
            <div className="flex flex-col gap-gap-toolbar rounded-xl border border-border bg-muted/20 p-card-pad">
              <div className="flex flex-col gap-gap-inline">
                <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  Subject
                </span>
                <span className="text-sm font-medium">{interpolate(template.subject)}</span>
              </div>
              <div className="flex flex-col gap-gap-inline">
                <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  Body
                </span>
                <span className="whitespace-pre-wrap text-sm">{interpolate(template.body)}</span>
              </div>
            </div>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
