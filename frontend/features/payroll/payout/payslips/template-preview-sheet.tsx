"use client";

import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { usePreviewPayslipTemplate } from "@/hooks/api/payroll";
import type { PayslipTemplate } from "@/types/payroll";

interface Props {
  template: PayslipTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayslipPreviewSheet({ template, open, onOpenChange }: Props) {
  const previewMutation = usePreviewPayslipTemplate();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      previewMutation.mutate({ layout: template.layout, config: template.config });
    }
    onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-2xl">
        <div className="shrink-0 px-6 py-4 border-b">
          <SheetHeader>
            <SheetTitle>Preview — {template.name}</SheetTitle>
            <SheetDescription>Sample payslip rendered with this template.</SheetDescription>
          </SheetHeader>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {previewMutation.isPending && (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {previewMutation.data?.html && (
            <iframe
              srcDoc={previewMutation.data.html}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-[600px] border-0"
              title="Payslip Preview"
            />
          )}
          {previewMutation.isError && (
            <div className="flex items-center justify-center h-[600px] text-sm text-muted-foreground">
              Failed to generate preview.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
