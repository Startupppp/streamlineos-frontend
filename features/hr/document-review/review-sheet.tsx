"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, ExternalLink, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUploadFile } from "@/lib/api/hooks/use-upload-file";

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

function docStatusVariant(
  status: OnboardingDoc["status"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "SUBMITTED":
      return "secondary";
    case "REJECTED":
      return "destructive";
    case "RE_UPLOAD_REQUESTED":
      return "outline";
    default:
      return "outline";
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
    [onClose]
  );

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
      }
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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit");
      return;
    }
    setUploadFile(file);
  }, []);

  const handleUploadSubmit = useCallback(async () => {
    if (!userId) return;
    if (!uploadDocTypeId) { toast.error("Please select a document type"); return; }
    if (!uploadFile) { toast.error("Please select a file"); return; }
    setIsUploading(true);
    try {
      const uploaded = await uploadFileMutation.mutateAsync({ file: uploadFile, folder: "onboarding-docs" });
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
    []
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
      }
    );
  }, [reuploadDoc, reuploadRemarks, reviewMutation]);

  return (
    <>
      <Sheet open={userId !== null} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0 sm:max-w-lg w-full">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <SheetTitle className="text-base">
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
                  className="h-7 text-xs shrink-0"
                  onClick={handleOpenUploadSheet}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-4 space-y-3">
              {docsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
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
                  <div key={doc.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium">{doc.documentTypeName}</p>
                          {doc.isMandatory && (
                            <Badge variant="default" className="text-[9px] py-0 h-4 shrink-0">
                              Required
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[11px] text-muted-foreground">
                          <span>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 hover:underline"
                              aria-label={`Download ${doc.fileName}`}
                            >
                              {doc.fileName}
                              <ExternalLink className="h-3 w-3 ml-0.5" />
                            </a>
                          </span>
                          {doc.fileSize != null && <span>{formatBytes(doc.fileSize)}</span>}
                          {doc.version != null && <span>v{doc.version}</span>}
                        </div>
                      </div>
                      <Badge
                        variant={docStatusVariant(doc.status)}
                        className="text-[10px] shrink-0"
                      >
                        {docStatusLabel(doc.status)}
                      </Badge>
                    </div>

                    {doc.reviewedAt && (
                      <p className="text-[11px] text-muted-foreground">
                        Reviewed {format(new Date(doc.reviewedAt), "MMM d, yyyy")}
                        {doc.reviewerName ? ` by ${doc.reviewerName}` : ""}
                      </p>
                    )}
                    {doc.remarks && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Remarks: {doc.remarks}
                      </p>
                    )}

                    {doc.status === "SUBMITTED" && canReview && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={() => setApproveDoc(doc)}
                            aria-label={`Approve ${doc.documentTypeName}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={() => handleOpenReupload(doc)}
                            aria-label={`Request re-upload for ${doc.documentTypeName}`}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Request Re-upload
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
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
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">Request Re-upload</SheetTitle>
            <SheetDescription className="text-xs">
              Explain what needs to be corrected for{" "}
              <strong>{reuploadDoc?.documentTypeName}</strong>.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Remarks <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Describe what needs to be corrected or re-submitted..."
                value={reuploadRemarks}
                onChange={handleReuploadRemarksChange}
                rows={4}
                aria-label="Re-upload remarks"
              />
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 border-t flex gap-2">
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
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">Upload Document</SheetTitle>
            <SheetDescription className="text-xs">
              Upload an onboarding document on behalf of{" "}
              <strong>{userName ?? "this employee"}</strong>.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Document Type <span className="text-destructive">*</span>
              </Label>
              <Select value={uploadDocTypeId} onValueChange={setUploadDocTypeId}>
                <SelectTrigger>
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
              <Label className="text-sm font-medium">
                File <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Choose File
                </Button>
                {uploadFile && (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs truncate text-muted-foreground max-w-[180px]">
                      {uploadFile.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => {
                        setUploadFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
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

          <div className="shrink-0 px-4 py-3 border-t flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleCloseUploadSheet(false)}
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
