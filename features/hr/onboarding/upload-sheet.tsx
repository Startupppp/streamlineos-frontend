"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { HrSheet } from "@/features/hr/hr-sheet";

import type { DocumentType, OnboardingDoc } from "./onboarding-types";

export interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType | null;
  existingDoc: OnboardingDoc | null;
  onSubmit: (fileUrl: string, fileName: string) => void;
  isPending: boolean;
}

export function UploadSheet({
  open,
  onOpenChange,
  documentType,
  existingDoc,
  onSubmit,
  isPending,
}: UploadSheetProps) {
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const handleSubmit = useCallback(() => {
    if (!fileUrl.trim()) {
      toast.error("Please enter a file URL");
      return;
    }
    if (!fileName.trim()) {
      toast.error("Please enter a file name");
      return;
    }
    onSubmit(fileUrl.trim(), fileName.trim());
  }, [fileUrl, fileName, onSubmit]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setFileUrl("");
        setFileName("");
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={
        existingDoc
          ? `Re-upload: ${documentType?.name}`
          : `Upload: ${documentType?.name}`
      }
      description={
        documentType?.description ??
        "Submit this document as part of your onboarding checklist."
      }
      onSubmit={handleSubmit}
      submitLabel="Submit Document"
      isPending={isPending}
    >
      {/* Upload note */}
      <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-[12px] text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground mb-0.5">How to upload</p>
        <p>
          Upload your file via the{" "}
          <strong>Files</strong> section (HR &rarr; Documents), then copy the
          file URL and paste it below.
        </p>
      </div>

      {/* If re-upload requested, show remarks */}
      {existingDoc?.status === "RE_UPLOAD_REQUESTED" && existingDoc.remarks && (
        <div className="rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 px-3 py-2.5 text-[12px] text-orange-800 dark:text-orange-300">
          <p className="font-medium mb-0.5">Reviewer remarks</p>
          <p>{existingDoc.remarks}</p>
        </div>
      )}

      <Separator />

      {/* File URL */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          File URL <span className="text-destructive">*</span>
        </Label>
        <Input
          type="url"
          placeholder="https://..."
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          aria-label="File URL"
        />
      </div>

      {/* File name */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          File Name <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="e.g. aadhaar-card.pdf"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          aria-label="File name"
        />
        <p className="text-[11px] text-muted-foreground">
          Include the file extension (e.g. .pdf, .jpg, .png).
        </p>
      </div>
    </HrSheet>
  );
}
