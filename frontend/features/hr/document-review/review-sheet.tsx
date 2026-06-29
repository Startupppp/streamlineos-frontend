"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, ExternalLink, Upload, X, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUploadFile } from "@/hooks/api/use-upload-file";

interface OnboardingDoc {
  id: number;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  version: number | null;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_UPLOAD_REQUESTED";
  reviewedAt: string | null;
  reviewerName: string | null;
  remarks: string | null;
  createdAt: string | null;
}

interface ReviewSheetProps {
  userId: string | null;
  userName: string | null;
  canReview: boolean;
  onClose: () => void;
}

interface DocumentType {
  id: number;
  name: string;
  isActive: boolean | null;
}

function useEmployeeOnboardingDocs(userId: string | null) {
  return useQuery<OnboardingDoc[]>({
    queryKey: queryKeys.hr.onboardingDocs(userId ?? undefined),
    queryFn: () =>
      apiClient.get<OnboardingDoc[]>("/hr/onboarding-docs", { params: { userId } }),
    enabled: !!userId,
  });
}

function useDocumentTypes() {
  return useQuery<DocumentType[]>({
    queryKey: queryKeys.hr.documentTypes(),
    queryFn: () => apiClient.get<DocumentType[]>("/hr/document-types"),
  });
}

function useUploadOnboardingDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      documentTypeId: number;
      fileUrl: string;
      fileName: string;
      fileSize?: number;
      mimeType?: string;
      targetUserId: string;
    }) => apiClient.post("/hr/onboarding-docs", data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingDocs(variables.targetUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingDocsAll });
    },
  });
}

function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      status,
      remarks,
    }: {
      docId: number;
      status: "APPROVED" | "RE_UPLOAD_REQUESTED";
      remarks?: string;
    }) =>
      apiClient.patch<{ success: boolean }>(`/hr/onboarding-docs/${docId}`, { status, remarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.onboardingDocsAll });
    },
  });
}

function getDocStatusBadgeClass(status: OnboardingDoc["status"]): string {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700";
    case "SUBMITTED":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700";
    case "REJECTED":
      return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700";
    case "RE_UPLOAD_REQUESTED":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700";
  }
}

function getDocStatusAccentClass(status: OnboardingDoc["status"]): string {
  switch (status) {
    case "APPROVED":
      return "border-l-emerald-500";
    case "SUBMITTED":
      return "border-l-blue-500";
    case "REJECTED":
      return "border-l-rose-500";
    case "RE_UPLOAD_REQUESTED":
      return "border-l-amber-500";
    default:
      return "border-l-slate-300";
  }
}

function docStatusLabel(status: OnboardingDoc["status"]): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "SUBMITTED":
      return "Submitted";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "RE_UPLOAD_REQUESTED":
      return "Re-upload Requested";
  }
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocCardProps {
  doc: OnboardingDoc;
  canReview: boolean;
  onApprove: (doc: OnboardingDoc) => void;
  onRequestReupload: (doc: OnboardingDoc) => void;
}

function DocCard({ doc, canReview, onApprove, onRequestReupload }: DocCardProps) {
  const handleApproveClick = useCallback(() => onApprove(doc), [doc, onApprove]);
  const handleReuploadClick = useCallback(() => onRequestReupload(doc), [doc, onRequestReupload]);

  return (
    <div
      className={cn(
        "rounded-xl border-l-4 border border-border bg-card shadow-sm overflow-hidden",
        getDocStatusAccentClass(doc.status),
      )}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{doc.documentTypeName}</p>
              {doc.isMandatory && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 shrink-0">
                  Required
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-muted-foreground">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
                aria-label={`Download ${doc.fileName}`}
              >
                {doc.fileName}
                <ExternalLink className="h-3 w-3 ml-0.5" />
              </a>
              {doc.fileSize != null && <span>{formatBytes(doc.fileSize)}</span>}
              {doc.version != null && <span>v{doc.version}</span>}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
              getDocStatusBadgeClass(doc.status),
            )}
          >
            {docStatusLabel(doc.status)}
          </span>
        </div>

        {doc.reviewedAt && (
          <p className="text-[11px] text-muted-foreground">
            Reviewed {format(new Date(doc.reviewedAt), "MMM d, yyyy")}
            {doc.reviewerName ? ` by ${doc.reviewerName}` : ""}
          </p>
        )}
        {doc.remarks && (
          <p className="text-[11px] text-muted-foreground italic border-l-2 border-muted pl-2">
            {doc.remarks}
          </p>
        )}

        {doc.status === "SUBMITTED" && canReview && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors duration-200"
                onClick={handleApproveClick}
                aria-label={`Approve ${doc.documentTypeName}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs flex-1 transition-colors duration-200"
                onClick={handleReuploadClick}
                aria-label={`Request re-upload for ${doc.documentTypeName}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Request Re-upload
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ReviewSheet({ userId, userName, canReview, onClose }: ReviewSheetProps) {
  const reviewMutation = useReviewDocument();
  const uploadDocMutation = useUploadOnboardingDoc();
  const uploadFileMutation = useUploadFile();
  const { data: employeeDocs, isLoading: docsLoading } = useEmployeeOnboardingDocs(userId);
  const { data: documentTypes } = useDocumentTypes();

  const [reuploadDoc, setReuploadDoc] = useState<OnboardingDoc | null>(null);
  const [reuploadRemarks, setReuploadRemarks] = useState("");
  const [approveDoc, setApproveDoc] = useState<OnboardingDoc | null>(null);

  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadDocTypeId, setUploadDocTypeId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  const handleSetApproveDoc = useCallback((doc: OnboardingDoc) => setApproveDoc(doc), []);

  const handleApprove = useCallback(() => {
    if (!approveDoc) return;
    reviewMutation.mutate(
      { docId: approveDoc.id, status: "APPROVED" },
      {
        onSuccess: () => {
          toast.success("Document approved");
          setApproveDoc(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [approveDoc, reviewMutation]);

  const handleCloseApprove = useCallback((open: boolean) => {
    if (!open) setApproveDoc(null);
  }, []);

  const handleOpenUploadSheet = useCallback(() => {
    setUploadDocTypeId("");
    setUploadFile(null);
    setUploadSheetOpen(true);
  }, []);

  const handleCloseUploadSheet = useCallback((open: boolean) => {
    if (!open) {
      setUploadDocTypeId("");
      setUploadFile(null);
      setUploadSheetOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleCancelUpload = useCallback(() => handleCloseUploadSheet(false), [handleCloseUploadSheet]);

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

  const handleUploadSubmit = useCallback(async () => {
    if (!userId) return;
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
        fileUrl: uploaded.url,
        fileName: uploadFile.name,
        fileSize: uploaded.size,
        mimeType: uploaded.mimeType,
        targetUserId: userId,
      });
      toast.success("Document uploaded on behalf of employee");
      setUploadSheetOpen(false);
      setUploadDocTypeId("");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsUploading(false);
    }
  }, [userId, uploadDocTypeId, uploadFile, uploadFileMutation, uploadDocMutation]);

  const handleOpenReupload = useCallback((doc: OnboardingDoc) => {
    setReuploadDoc(doc);
    setReuploadRemarks("");
  }, []);

  const handleCloseReupload = useCallback((open: boolean) => {
    if (!open) {
      setReuploadDoc(null);
      setReuploadRemarks("");
    }
  }, []);

  const handleCancelReupload = useCallback(() => {
    setReuploadDoc(null);
    setReuploadRemarks("");
  }, []);

  const handleReuploadRemarksChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReuploadRemarks(e.target.value);
    },
    [],
  );

  const handleReupload = useCallback(() => {
    if (!reuploadDoc) return;
    if (!reuploadRemarks.trim()) {
      toast.error("Please provide remarks explaining what needs to be corrected");
      return;
    }
    reviewMutation.mutate(
      {
        docId: reuploadDoc.id,
        status: "RE_UPLOAD_REQUESTED",
        remarks: reuploadRemarks.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Re-upload requested");
          setReuploadDoc(null);
          setReuploadRemarks("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [reuploadDoc, reuploadRemarks, reviewMutation]);

  return (
    <>
      <Sheet open={userId !== null} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0 sm:max-w-lg w-full">
          <SheetHeader className="shrink-0 px-5 pt-4 pb-3 border-b">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold">
                  {userName ?? "Employee"} — Documents
                </SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  {canReview
                    ? "Review and approve submitted onboarding documents."
                    : "View submitted onboarding documents."}
                </SheetDescription>
              </div>
              {canReview && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs shrink-0"
                  onClick={handleOpenUploadSheet}
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-3">
              {docsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : !employeeDocs || employeeDocs.length === 0 ? (
                <EmptyState
                  illustration={<EmptyDocumentsIllustration className="h-24 w-24" />}
                  title="No documents submitted"
                  description="This employee has not submitted any documents yet."
                  compact
                />
              ) : (
                employeeDocs.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    canReview={canReview}
                    onApprove={handleSetApproveDoc}
                    onRequestReupload={handleOpenReupload}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={approveDoc !== null}
        onOpenChange={handleCloseApprove}
        title="Approve Document"
        description={`Approve "${approveDoc?.documentTypeName}" submitted by ${userName ?? "this employee"}?`}
        confirmLabel="Approve"
        onConfirm={handleApprove}
        isPending={reviewMutation.isPending}
      />

      <Sheet open={reuploadDoc !== null} onOpenChange={handleCloseReupload}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-5 pt-4 pb-3 border-b">
            <SheetTitle className="text-base font-semibold">Request Re-upload</SheetTitle>
            <SheetDescription className="text-xs">
              Explain what needs to be corrected for{" "}
              <strong>{reuploadDoc?.documentTypeName}</strong>.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Remarks <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Describe what needs to be corrected or re-submitted..."
                value={reuploadRemarks}
                onChange={handleReuploadRemarksChange}
                rows={4}
                className="resize-none"
                aria-label="Re-upload remarks"
              />
            </div>
          </div>

          <div className="shrink-0 px-5 py-3 border-t flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancelReupload}
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleReupload}
              disabled={reviewMutation.isPending || !reuploadRemarks.trim()}
            >
              {reviewMutation.isPending && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Request
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={uploadSheetOpen} onOpenChange={handleCloseUploadSheet}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-5 pt-4 pb-3 border-b">
            <SheetTitle className="text-base font-semibold">Upload Document</SheetTitle>
            <SheetDescription className="text-xs">
              Upload an onboarding document on behalf of{" "}
              <strong>{userName ?? "this employee"}</strong>.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Document Type <span className="text-destructive">*</span>
              </Label>
              <Select value={uploadDocTypeId} onValueChange={setUploadDocTypeId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {(documentTypes ?? [])
                    .filter((dt) => dt.isActive !== false)
                    .map((dt) => (
                      <SelectItem key={dt.id} value={String(dt.id)}>
                        {dt.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                File <span className="text-destructive">*</span>
              </Label>
              {uploadFile ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate text-foreground flex-1 min-w-0">
                    {uploadFile.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 hover:text-destructive transition-colors duration-200"
                    onClick={handleClearFile}
                    aria-label="Remove file"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full gap-1.5 text-xs border-dashed"
                  onClick={handleChooseFile}
                  disabled={isUploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Choose File
                </Button>
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

          <div className="shrink-0 px-5 py-3 border-t flex gap-2">
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
              disabled={isUploading || !uploadDocTypeId || !uploadFile}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
