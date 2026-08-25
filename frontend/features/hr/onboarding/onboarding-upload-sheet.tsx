"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { HrSheet } from "@/features/hr/hr-sheet";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { DocumentType, OnboardingDoc } from "./onboarding-document-checklist-row";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function validateDocumentFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return "Invalid file type. Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File size must be under 10 MB.";
  }
  return null;
}

interface UploadSheetProps {
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }
    if (fileError) {
      toast.error(fileError);
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("folder", "onboarding-docs");
      const json = await apiClient.upload<{ key: string }>("/storage/upload", fd);
      onSubmit(json.key, selectedFile.name);
    } catch {
      toast.error("File upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, fileError, onSubmit]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setSelectedFile(null);
        setFileError(null);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange],
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!f) return;
    const validationError = validateDocumentFile(f);
    if (validationError) {
      setFileError(validationError);
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(f);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setFileError(null);
  }, []);

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={existingDoc ? `Re-upload: ${documentType?.name}` : `Upload: ${documentType?.name}`}
      description={
        documentType?.description ?? "Submit this document as part of your onboarding checklist."
      }
      onSubmit={handleSubmit}
      submitLabel="Submit Document"
      isPending={isPending || isUploading}
    >
      {existingDoc?.status === "RE_UPLOAD_REQUESTED" && existingDoc.remarks && (
        <div className="rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2.5 text-xs text-status-warning-ink">
          <p className="font-semibold mb-0.5">Reviewer remarks</p>
          <p className="text-status-warning-ink">{existingDoc.remarks}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Document File <span className="text-destructive">*</span>
        </Label>
        <div
          className={cn(
            "rounded-lg border border-dashed p-6 transition-colors duration-200",
            fileError
              ? "border-status-danger-rule bg-status-danger-surface"
              : "border-border hover:border-muted-foreground/40",
          )}
        >
          <label className="flex flex-col items-center gap-2.5 cursor-pointer">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {selectedFile ? selectedFile.name : "Click to select a file"}
              </p>
              {!selectedFile && (
                <p className="text-dense text-muted-foreground mt-0.5">PDF, DOC, DOCX, JPG, PNG — max 10 MB</p>
              )}
            </div>
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              aria-label={`Upload file for ${documentType?.name ?? "document"}`}
              onChange={handleFileChange}
            />
          </label>
          {selectedFile && (
            <button
              type="button"
              className="text-dense text-muted-foreground hover:text-status-danger-ink underline block mx-auto mt-2 transition-colors duration-200"
              onClick={handleRemoveFile}
            >
              Remove file
            </button>
          )}
        </div>
        {fileError && (
          <p className="text-dense text-status-danger-ink" role="alert">
            {fileError}
          </p>
        )}
      </div>
    </HrSheet>
  );
}
