"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, ExternalLink } from "lucide-react";

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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

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

function useEmployeeOnboardingDocs(userId: string | null) {
  return useQuery<OnboardingDoc[]>({
    queryKey: ["hr", "onboarding-docs", userId],
    queryFn: () =>
      apiClient.get<OnboardingDoc[]>("/hr/onboarding-docs", { params: { userId } }),
    enabled: !!userId,
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
      qc.invalidateQueries({ queryKey: ["hr", "onboarding-docs"] });
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
  const { data: employeeDocs, isLoading: docsLoading } = useEmployeeOnboardingDocs(userId);

  const [reuploadDoc, setReuploadDoc] = useState<OnboardingDoc | null>(null);
  const [reuploadRemarks, setReuploadRemarks] = useState("");
  const [approveDoc, setApproveDoc] = useState<OnboardingDoc | null>(null);

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
            <SheetTitle className="text-base">
              {userName ?? "Employee"} — Documents
            </SheetTitle>
            <SheetDescription className="text-xs">
              {canReview
                ? "Review and approve submitted onboarding documents."
                : "View submitted onboarding documents."}
            </SheetDescription>
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
    </>
  );
}
