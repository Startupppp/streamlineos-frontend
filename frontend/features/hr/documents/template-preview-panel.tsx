"use client";

import DOMPurify from "isomorphic-dompurify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface TemplatePreviewPanelProps {
  previewHtml: string;
}

export function TemplatePreviewPanel({ previewHtml }: TemplatePreviewPanelProps) {
  return (
    <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b px-5 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Eye className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">Live Preview</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Rendered with sample data. Tokens without a sample value remain as-is.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div
            className="max-h-[600px] overflow-y-auto rounded-xl border bg-card p-5 text-sm prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
