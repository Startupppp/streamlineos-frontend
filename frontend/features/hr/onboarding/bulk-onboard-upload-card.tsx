"use client";

import { useRef, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PolicyMissingBanner } from "@/components/hr/reporting-lines/policy-missing-banner";
import { cn } from "@/lib/utils";
import { MAX_ROWS } from "./bulk-onboard-columns";

interface BulkOnboardUploadCardProps {
  parsing: boolean;
  onFile: (file: File) => void;
}

export function BulkOnboardUploadCard({ parsing, onFile }: BulkOnboardUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Upload file</CardTitle>
        <CardDescription className="text-xs">
          CSV or Excel (.xlsx). Nothing is created until you review the preview and confirm.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <PolicyMissingBanner context="file" />
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload employee onboard file"
          aria-busy={parsing || undefined}
          onKeyDown={handleKeyDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleClick}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors sm:p-10",
            "hover:border-primary/50 hover:bg-primary/5",
            parsing && "pointer-events-none opacity-70",
          )}
        >
          {parsing ? (
            <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
          )}
          <p className="text-sm font-medium">{parsing ? "Checking file…" : "Drag & drop or click to upload"}</p>
          <p className="mt-1 text-xs text-muted-foreground">.csv, .xlsx — max {MAX_ROWS} employees</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
          aria-label="Choose employee onboard file"
        />
        <div className="flex items-start gap-2 text-dense text-muted-foreground">
          <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Download the template first so the columns match. A blank primaryManagerEmail is assigned by your
            fallback policy, and the preview names who that is.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
