"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { FileType, Loader2, Upload } from "lucide-react";
import { UploadIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddVaultDocument,
  type VaultDocumentType,
} from "@/hooks/api/hr/recruitment";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

const DOCUMENT_TYPES: Array<{ value: VaultDocumentType; label: string }> = [
  { value: "AADHAR", label: "Aadhar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "CERTIFICATE", label: "Certificate/Degree" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "OTHER", label: "Other" },
];

const ACCEPTED_TYPES = ".pdf,.docx,.doc";
const ACCEPTED_LABEL = "PDF, DOCX, DOC";

interface VaultUploadAreaProps {
  candidateId: number;
}

export function VaultUploadArea({ candidateId }: VaultUploadAreaProps) {
  const [docType, setDocType] = useState<VaultDocumentType>("OTHER");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addDoc = useAddVaultDocument(candidateId);
  const { iconRef: uploadIconRef, hoverHandlers: uploadHoverHandlers } = useAnimatedIcon();

  const handleFile = useCallback(
    async (file: File) => {
      const fakeUrl = URL.createObjectURL(file);
      const fakeKey = `org/candidates/${candidateId}/${Date.now()}-${file.name}`;

      addDoc.mutate(
        {
          filename: file.name,
          s3Key: fakeKey,
          fileUrl: fakeUrl,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          documentType: docType,
        },
        {
          onSuccess: () => toast.success(`${file.name} uploaded`),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [addDoc, candidateId, docType],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDropZoneClick = useCallback(() => {
    if (!addDoc.isPending) fileRef.current?.click();
  }, [addDoc.isPending]);

  const handleUploadButtonClick = useCallback(
    () => fileRef.current?.click(),
    [],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  function handleDocTypeChange(v: string) {
    setDocType(v as VaultDocumentType);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={docType} onValueChange={handleDocTypeChange}>
          <SelectTrigger className="text-xs flex-1 min-w-0">
            <SelectValue placeholder="Document type" />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 shrink-0"
          disabled={addDoc.isPending}
          onClick={handleUploadButtonClick}
          {...uploadHoverHandlers}
        >
          {addDoc.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <UploadIcon ref={uploadIconRef} size={12} />
          )}
          {addDoc.isPending ? "Uploading..." : "Browse"}
        </Button>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-5 text-center transition-colors duration-200 cursor-pointer select-none",
          addDoc.isPending
            ? "border-primary/30 bg-primary/5 cursor-not-allowed opacity-60"
            : dragging
              ? "border-primary/60 bg-primary/5"
              : "border-border hover:border-muted-foreground/40 hover:bg-muted/20",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropZoneClick}
        role="button"
        tabIndex={0}
        aria-label="Drop zone for document upload"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleDropZoneClick();
        }}
      >
        {addDoc.isPending ? (
          <Loader2
            className="h-6 w-6 mx-auto text-primary mb-2 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <div className="w-8 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2">
            <Upload
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}
        <p className="text-xs font-medium text-foreground">
          {addDoc.isPending
            ? "Uploading document..."
            : "Drop file here or click to browse"}
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <FileType
            className="h-3 w-3 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-[10px] text-muted-foreground font-medium">
            {ACCEPTED_LABEL} · Max 10MB
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        aria-label="Upload vault document"
        onChange={handleFileChange}
      />
    </div>
  );
}
