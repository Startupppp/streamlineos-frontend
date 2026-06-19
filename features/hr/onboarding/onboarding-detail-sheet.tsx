"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  ExternalLink,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { HrSheet } from "@/features/hr/hr-sheet";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";

interface DocumentType {
  id: number;
  name: string;
  description: string | null;
  isMandatory: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  applicableRoles: string[] | null;
}

interface OnboardingDoc {
  id: number;
  documentTypeId: number;
  documentTypeName: string;
  isMandatory: boolean;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_UPLOAD_REQUESTED";
  reviewedAt: string | null;
  reviewerName: string | null;
  remarks: string | null;
  version: number | null;
}

function useMyOnboardingDocs() {
  return useQuery<OnboardingDoc[]>({
    queryKey: queryKeys.hr.myOnboardingDocs(),
    queryFn: () => apiClient.get<OnboardingDoc[]>("/hr/onboarding-docs"),
  });
}

function useDocumentTypes() {
  return useQuery<DocumentType[]>({
    queryKey: queryKeys.hr.documentTypes(),
    queryFn: () => apiClient.get<DocumentType[]>("/hr/document-types"),
  });
}

function useSubmitOnboardingDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { documentTypeId: number; fileUrl: string; fileName: string }) =>
      apiClient.post("/hr/onboarding-docs", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.myOnboardingDocs() });
    },
  });
}

function docStatusIcon(status: OnboardingDoc["status"]) {
  const icons: Record<string, React.ReactNode> = {
    APPROVED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    SUBMITTED: <Clock className="h-4 w-4 text-amber-500" />,
    REJECTED: <AlertCircle className="h-4 w-4 text-destructive" />,
    RE_UPLOAD_REQUESTED: <RefreshCw className="h-4 w-4 text-orange-500" />,
    default: <FileText className="h-4 w-4 text-muted-foreground" />,
  };
  return icons[status] ?? icons.default;
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
    default:
      return "outline";
  }
}

function docStatusLabel(status: OnboardingDoc["status"]): string {
  const labels: Record<string, string> = {
    APPROVED: "Approved",
    SUBMITTED: "Under Review",
    REJECTED: "Rejected",
    RE_UPLOAD_REQUESTED: "Re-upload Required",
    PENDING: "Pending",
  };
  return labels[status] ?? "Pending";
}

function canUpload(status: OnboardingDoc["status"] | undefined): boolean {
  return !status || status === "PENDING" || status === "RE_UPLOAD_REQUESTED" || status === "REJECTED";
}

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType | null;
  existingDoc: OnboardingDoc | null;
  onSubmit: (fileUrl: string, fileName: string) => void;
  isPending: boolean;
}

function UploadSheet({
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
      const json = await apiClient.upload<{ url: string }>("/api/storage/upload", fd);
      onSubmit(json.url, selectedFile.name);
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
    [onOpenChange]
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!f) return;
    if (!ACCEPTED_MIME_TYPES.has(f.type)) {
      setFileError("Invalid file type. Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG.");
      setSelectedFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setFileError("File size must be under 10 MB.");
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
        <div className="rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 px-3 py-2.5 text-[12px] text-orange-800 dark:text-orange-300">
          <p className="font-medium mb-0.5">Reviewer remarks</p>
          <p>{existingDoc.remarks}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Document File <span className="text-destructive">*</span>
        </Label>
        <div
          className={`rounded-lg border border-dashed p-4 space-y-2 ${fileError ? "border-destructive bg-destructive/5" : "border-border"}`}
        >
          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-muted-foreground text-center">
              {selectedFile ? selectedFile.name : "Click to select a file"}
            </span>
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
              className="text-[11px] text-muted-foreground hover:text-destructive underline block mx-auto"
              onClick={handleRemoveFile}
            >
              Remove
            </button>
          )}
        </div>
        {fileError ? (
          <p className="text-[11px] text-destructive" role="alert">
            {fileError}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Accepted: PDF, DOC, DOCX, JPG, JPEG, PNG — max 10 MB
          </p>
        )}
      </div>
    </HrSheet>
  );
}

export function EmployeeDocumentsTab() {
  const { data: myDocs, isLoading: docsLoading } = useMyOnboardingDocs();
  const { data: docTypes, isLoading: typesLoading } = useDocumentTypes();
  const submitDoc = useSubmitOnboardingDoc();

  const [uploadTarget, setUploadTarget] = useState<DocumentType | null>(null);
  const [uploadExisting, setUploadExisting] = useState<OnboardingDoc | null>(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  const isLoading = docsLoading || typesLoading;

  const checklist = (() => {
    const types = (docTypes ?? []).filter((dt) => dt.isActive !== false);
    const docsByTypeId = new Map((myDocs ?? []).map((d) => [d.documentTypeId, d]));
    return types.map((dt) => ({
      docType: dt,
      submission: docsByTypeId.get(dt.id) ?? null,
    }));
  })();

  const approvedCount = checklist.filter((c) => c.submission?.status === "APPROVED").length;

  const handleOpenUpload = useCallback((dt: DocumentType, existing: OnboardingDoc | null) => {
    setUploadTarget(dt);
    setUploadExisting(existing);
    setUploadSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (fileUrl: string, fileName: string) => {
      if (!uploadTarget) return;
      submitDoc.mutate(
        { documentTypeId: uploadTarget.id, fileUrl, fileName },
        {
          onSuccess: () => {
            toast.success("Document submitted for review");
            setUploadSheetOpen(false);
            setUploadTarget(null);
            setUploadExisting(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [uploadTarget, submitDoc]
  );

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (checklist.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyUploadIllustration className="h-24 w-24" />}
        title="No documents required"
        description="Your HR team hasn't configured any required documents yet."
        compact
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 mb-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <p className="text-sm">
          <span className="font-semibold">{approvedCount}</span> of{" "}
          <span className="font-semibold">{checklist.length}</span> documents approved
        </p>
      </div>

      <div className="space-y-2">
        {checklist.map(({ docType, submission }) => (
          <Card key={docType.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {docStatusIcon(submission?.status ?? "PENDING")}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium">{docType.name}</p>
                    {docType.isMandatory && (
                      <Badge variant="default" className="text-[9px] py-0 h-4 shrink-0">
                        Required
                      </Badge>
                    )}
                    {submission && (
                      <Badge
                        variant={docStatusVariant(submission.status)}
                        className="text-[10px] shrink-0"
                      >
                        {docStatusLabel(submission.status)}
                      </Badge>
                    )}
                  </div>

                  {docType.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {docType.description}
                    </p>
                  )}

                  {submission?.fileUrl && (
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline mt-0.5"
                      aria-label={`View ${submission.fileName}`}
                    >
                      {submission.fileName}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}

                  {submission?.status === "RE_UPLOAD_REQUESTED" && submission.remarks && (
                    <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">
                      Remarks: {submission.remarks}
                    </p>
                  )}
                </div>

                {canUpload(submission?.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => handleOpenUpload(docType, submission)}
                    aria-label={`Upload ${docType.name}`}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {submission ? "Re-upload" : "Upload"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <UploadSheet
        open={uploadSheetOpen}
        onOpenChange={setUploadSheetOpen}
        documentType={uploadTarget}
        existingDoc={uploadExisting}
        onSubmit={handleSubmit}
        isPending={submitDoc.isPending}
      />
    </>
  );
}
