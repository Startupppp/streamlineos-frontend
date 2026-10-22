"use client";

import { useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/download-blob";
import {
  Sheet,
  SheetBody,
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

function previewFilename(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `payslip-preview-${slug || "template"}.html`;
}

export function PayslipPreviewSheet({ template, open, onOpenChange }: Props) {
  const previewMutation = usePreviewPayslipTemplate();
  const { mutate } = previewMutation;
  const { layout, config } = template;
  const html = previewMutation.data?.html;

  function handleDownload() {
    if (!html) return;
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), previewFilename(template.name));
  }

  useEffect(() => {
    if (open) mutate({ layout, config });
  }, [open, layout, config, mutate]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden w-full sm:max-w-2xl">
        <div className="shrink-0 px-6 py-4 border-b">
          <SheetHeader>
            <SheetTitle>Preview — {template.name}</SheetTitle>
            <SheetDescription>Sample payslip rendered with this template.</SheetDescription>
          </SheetHeader>
          <Button size="sm" variant="outline" className="mt-3" onClick={handleDownload} disabled={!html}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download preview
          </Button>
        </div>
        <SheetBody className="px-6 py-4">
          {previewMutation.isPending && (
            <div className="flex items-center justify-center h-[600px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {html && (
            <iframe
              srcDoc={html}
              sandbox=""
              className="w-full h-[600px] border-0"
              title="Payslip Preview"
            />
          )}
          {previewMutation.isError && (
            <div className="flex items-center justify-center h-[600px] text-sm text-muted-foreground">
              Failed to generate preview.
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
