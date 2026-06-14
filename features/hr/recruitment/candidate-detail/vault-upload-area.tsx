"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
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
} from "@/lib/api/hooks/hr/recruitment";
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

interface VaultUploadAreaProps {
  candidateId: number;
}

export function VaultUploadArea({ candidateId }: VaultUploadAreaProps) {
  const [docType, setDocType] = useState<VaultDocumentType>("OTHER");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addDoc = useAddVaultDocument(candidateId);

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

  const handleDropZoneClick = useCallback(() => fileRef.current?.click(), []);
  const handleUploadButtonClick = useCallback(() => fileRef.current?.click(), []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={docType} onValueChange={(v) => setDocType(v as VaultDocumentType)}>
          <SelectTrigger className="h-8 text-xs w-48">
            <SelectValue placeholder="Document type" />
          </SelectTrigger>
          <SelectContent>
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
          className="h-8 text-xs"
          disabled={addDoc.isPending}
          onClick={handleUploadButtonClick}
        >
          <Upload className="h-3 w-3 mr-1" />
          {addDoc.isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
          dragging
            ? "border-primary/50 bg-primary/5"
            : "border-border hover:border-muted-foreground/40",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropZoneClick}
      >
        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">Drop PDF or DOCX here, or click to browse</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        aria-label="Upload vault document"
        onChange={handleFileChange}
      />
    </div>
  );
}
