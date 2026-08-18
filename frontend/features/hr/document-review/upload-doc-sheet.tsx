"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { UploadIcon, XIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { useHrDocumentTypes } from "@/hooks/api/hr/document-types";
import { useMyOnboardingDocs } from "@/hooks/api/hr/documents";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface UploadDocSheetProps {
  open: boolean;
  userId: string | null;
  userName: string | null;
  onOpenChange: (open: boolean) => void;
  selfUpload?: boolean;
}

interface DocTypeOption {
  id: number;
  name: string;
}

function useUploadOnboardingDoc(selfUpload: boolean) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "onboarding-documents", selfUpload ? "self-upload" : "admin-upload"],
    mutationFn: (data: {
      documentTypeId: number;
      fileUrl: string;
      fileName: string;
      fileSize?: number;
      mimeType?: string;
      targetUserId?: string;
    }) => apiClient.post(selfUpload ? "/hr/onboarding-docs/me" : "/hr/onboarding-docs", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingDocsAll });
    },
  });
}

export function UploadDocSheet({
  open,
  userId,
  userName,
  onOpenChange,
  selfUpload = false,
}: UploadDocSheetProps) {
  const {
    data: documentTypes,
    isLoading: typesLoading,
    isError: typesError,
    refetch: refetchTypes,
  } = useHrDocumentTypes({ enabled: open });
  const { data: myDocs } = useMyOnboardingDocs({ enabled: open && selfUpload });
  const uploadFileMutation = useUploadFile();
  const uploadDocMutation = useUploadOnboardingDoc(selfUpload);

  const [uploadDocTypeId, setUploadDocTypeId] = useState<string | undefined>(undefined);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeOptions = useMemo((): DocTypeOption[] => {
    const fromCatalog = (documentTypes ?? [])
      .filter((dt) => dt.isActive !== false)
      .map((dt) => ({ id: dt.id, name: dt.name }));
    if (fromCatalog.length > 0) return fromCatalog;

    if (!selfUpload) return [];

    const byId = new Map<number, string>();
    for (const doc of myDocs?.data ?? []) {
      if (!byId.has(doc.documentTypeId)) {
        byId.set(doc.documentTypeId, doc.documentTypeName);
      }
    }
    return Array.from(byId, ([id, name]) => ({ id, name }));
  }, [documentTypes, myDocs?.data, selfUpload]);

  const handleCloseSheet = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setUploadDocTypeId(undefined);
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleCancelUpload = useCallback(() => handleCloseSheet(false), [handleCloseSheet]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit");
      return;
    }
    setUploadFile(file);
  }, []);

  const handleClearFile = useCallback(() => {
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRetryTypes = useCallback(() => {
    void refetchTypes();
  }, [refetchTypes]);

  const handleUploadSubmit = useCallback(async () => {
    if (!selfUpload && !userId) return;
    if (!uploadDocTypeId) {
      toast.error("Please select a document type");
      return;
    }
    if (!uploadFile) {
      toast.error("Please select a file");
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await uploadFileMutation.mutateAsync({
        file: uploadFile,
        folder: "onboarding-docs",
      });
      await uploadDocMutation.mutateAsync({
        documentTypeId: Number(uploadDocTypeId),
        fileUrl: uploaded.key,
        fileName: uploadFile.name,
        fileSize: uploaded.size,
        mimeType: uploaded.mimeType,
        ...(userId ? { targetUserId: userId } : {}),
      });
      toast.success(
        selfUpload ? "Document uploaded" : "Document uploaded on behalf of employee",
      );
      handleCloseSheet(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsUploading(false);
    }
  }, [
    userId,
    selfUpload,
    uploadDocTypeId,
    uploadFile,
    uploadFileMutation,
    uploadDocMutation,
    handleCloseSheet,
  ]);

  return (
    <Sheet open={open} onOpenChange={handleCloseSheet}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle className="text-base font-semibold">Upload Document</SheetTitle>
          <SheetDescription className="text-xs">
            {selfUpload ? (
              "Upload one of your required onboarding documents. HR will review it."
            ) : (
              <>
                Upload an onboarding document on behalf of{" "}
                <strong>{userName ?? "this employee"}</strong>.
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Document Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={uploadDocTypeId}
              onValueChange={setUploadDocTypeId}
              disabled={typeOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    typesLoading
                      ? "Loading document types…"
                      : typesError && typeOptions.length === 0
                        ? "Document types unavailable"
                        : typeOptions.length === 0
                          ? "No document types available"
                          : "Select document type"
                  }
                />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {typeOptions.map((dt) => (
                  <SelectItem key={dt.id} value={String(dt.id)}>
                    {dt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typesError && typeOptions.length === 0 ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Couldn’t load document types.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleRetryTypes}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {!typesLoading && !typesError && typeOptions.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No document types configured. Ask HR to add them under Document
                Types.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              File <span className="text-destructive">*</span>
            </Label>
            {uploadFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {uploadFile.name}
                </span>
                <AnimatedIconButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 transition-colors duration-200 hover:text-destructive"
                  onClick={handleClearFile}
                  aria-label="Remove file"
                  icon={XIcon}
                  iconSize={12}
                />
              </div>
            ) : (
              <AnimatedIconButton
                type="button"
                variant="outline"
                className="h-9 w-full gap-1.5 border-dashed text-xs"
                onClick={handleChooseFile}
                disabled={isUploading}
                icon={UploadIcon}
                iconSize={14}
                iconClassName="mr-1.5"
              >
                Choose File
              </AnimatedIconButton>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="application/pdf,image/*,.doc,.docx"
              onChange={handleFileChange}
            />
            <p className="text-[11px] text-muted-foreground">
              Accepted: PDF, images, Word documents. Max 10 MB.
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t px-6 py-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancelUpload}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleUploadSubmit}
            disabled={isUploading || !uploadDocTypeId || !uploadFile || typeOptions.length === 0}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
