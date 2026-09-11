"use client";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ToggleKey } from "@/types/payroll/setup";
import { COMPLEXITY_CONFIG, TOGGLE_META } from "@/features/payroll/setup/lib/constants";
import type { PayrollTemplate } from "@/hooks/api/payroll/templates-schema";

type TemplatePreviewSheetProps = {
  template: PayrollTemplate | null;
  onOpenChange: (open: boolean) => void;
};

export function TemplatePreviewSheet({ template, onOpenChange }: TemplatePreviewSheetProps) {
  const open = template !== null;

  function handleOpenChange(next: boolean) {
    if (!next) onOpenChange(false);
  }

  if (!template) return null;

  const complexity = template.complexity ? COMPLEXITY_CONFIG[template.complexity] : COMPLEXITY_CONFIG.SIMPLE;
  const enabledToggles = (Object.entries(template.defaultToggles) as [ToggleKey, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => TOGGLE_META[k]?.label ?? k);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden w-full sm:max-w-lg">
        <div className="shrink-0 px-6 py-4 border-b">
          <SheetHeader className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base">{template.name}</SheetTitle>
              <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium", complexity.className)}>
                {complexity.label}
              </span>
            </div>
            <SheetDescription className="text-xs">{template.description}</SheetDescription>
          </SheetHeader>
        </div>

        <SheetBody className="px-6 py-4 space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Best For
            </p>
            <p className="text-sm text-foreground">{template.bestFor}</p>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Components ({template.defaultComponents.length})
            </p>
            <div className="space-y-1.5">
              {template.defaultComponents.map((c) => (
                <div key={c.code} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.calcMethod}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Enabled Features
            </p>
            <div className="flex flex-wrap gap-1.5">
              {enabledToggles.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center px-2 py-0.5 rounded text-dense bg-muted text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
