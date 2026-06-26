"use client";

import DOMPurify from "isomorphic-dompurify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface TemplatePreviewPanelProps {
  previewHtml: string;
}

export function TemplatePreviewPanel({ previewHtml }: TemplatePreviewPanelProps) {
  return (
    <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Live Preview
          </CardTitle>
          <CardDescription>
            Rendered with sample data. Tokens without a sample value remain as-is.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="max-h-[600px] overflow-y-auto rounded-md border bg-white dark:bg-neutral-950 p-5 text-sm prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
