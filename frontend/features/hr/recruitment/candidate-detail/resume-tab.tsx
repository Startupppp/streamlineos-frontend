"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface Props {
  resumeUrl: string | null;
  resumeText: string | null;
}

export function ResumeTab({ resumeUrl, resumeText }: Props) {
  if (!resumeUrl && !resumeText) {
    return (
      <EmptyState
        illustrationPreset="documents"
        title="No resume on file"
        description="This candidate hasn't uploaded a resume yet."
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      {resumeUrl && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
            <span className="text-xs font-semibold text-foreground">Resume</span>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" asChild>
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Open
              </a>
            </Button>
          </div>
          <iframe src={resumeUrl} className="w-full h-[600px]" title="Resume" />
        </div>
      )}
      {resumeText && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-foreground mb-2">Extracted text</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">{resumeText}</p>
        </div>
      )}
    </div>
  );
}
