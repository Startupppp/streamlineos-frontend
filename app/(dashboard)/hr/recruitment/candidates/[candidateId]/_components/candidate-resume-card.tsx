"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Eye, ExternalLink, Download, FileText } from "lucide-react";

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").pop() ?? "resume";
    const decoded = decodeURIComponent(last);
    const match = decoded.match(/^\d+-(.+)$/);
    return match ? match[1] : decoded;
  } catch {
    return "resume";
  }
}

function fileKind(name: string): "pdf" | "doc" {
  return name.toLowerCase().endsWith(".pdf") ? "pdf" : "doc";
}

interface CandidateResumeCardProps {
  candidateId: number;
  resumeUrl: string | null;
  candidateName: string;
}

export function CandidateResumeCard({
  candidateId,
  resumeUrl,
  candidateName,
}: CandidateResumeCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!resumeUrl) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Resume
            </span>
          </div>
          <p className="text-xs text-muted-foreground">No resume on file yet.</p>
        </CardContent>
      </Card>
    );
  }

  const name = fileNameFromUrl(resumeUrl);
  const kind = fileKind(name);
  const isPdf = kind === "pdf";

  const proxyUrl = `/api/hr/recruitment/candidates/${candidateId}/resume`;
  const downloadUrl = `${proxyUrl}?download=1`;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Resume
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <div
              className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                isPdf
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              }`}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate" title={name}>
                {name}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {kind === "pdf" ? "PDF document" : "Word document"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {isPdf && (
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs flex-1 min-w-[90px]"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Preview
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8 text-xs flex-1 min-w-[90px]" asChild>
              <a href={proxyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open
              </a>
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs flex-1 min-w-[90px]" asChild>
              <a href={downloadUrl}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {isPdf && (
        <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-2xl lg:max-w-4xl p-0 flex flex-col gap-0"
          >
            <SheetHeader className="px-5 py-4 border-b">
              <SheetTitle className="text-base">{candidateName} · Resume</SheetTitle>
              <SheetDescription className="text-xs truncate">{name}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 bg-muted/40 overflow-hidden">
              <iframe
                src={`${proxyUrl}#toolbar=1&navpanes=0`}
                title={`Resume preview — ${candidateName}`}
                className="w-full h-full border-0"
              />
            </div>
            <div className="px-5 py-3 border-t bg-card flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={proxyUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open in new tab
                </a>
              </Button>
              <Button size="sm" asChild>
                <a href={downloadUrl}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </a>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
