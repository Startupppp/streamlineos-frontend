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
  Circle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { HrSheet } from "@/features/hr/hr-sheet";
import { cn } from "@/lib/utils";

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
    staleTime: 60_000,
  });
}

function useDocumentTypes() {
  return useQuery<DocumentType[]>({
    queryKey: queryKeys.hr.documentTypes(),
    queryFn: () => apiClient.get<DocumentType[]>("/hr/document-types"),
    staleTime: 5 * 60_000,
  });
}

function useSubmitOnboardingDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "onboarding-doc", "submit"],
    mutationFn: (body: { documentTypeId: number; fileUrl: string; fileName: string }) =>
      apiClient.post("/hr/onboarding-docs", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.myOnboardingDocs() });
    },
  });
}

function docStatusIcon(status: OnboardingDoc["status"]) {
  if (status === "APPROVED") return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  if (status === "SUBMITTED") return <Clock className="h-4 w-4 text-amber-500" />;
  if (status === "REJECTED") return <AlertCircle className="h-4 w-4 text-rose-500" />;
  if (status === "RE_UPLOAD_REQUESTED") return <RefreshCw className="h-4 w-4 text-amber-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

function docStatusBadgeClass(status: OnboardingDoc["status"]): string {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  if (status === "SUBMITTED") return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
  if (status === "RE_UPLOAD_REQUESTED") return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700";
}

function docStatusLabel(status: OnboardingDoc["status"]): string {
  const labels: Record<OnboardingDoc["status"], string> = {
    APPROVED: "Approved",
    SUBMITTED: "Under Review",
    REJECTED: "Rejected",
    RE_UPLOAD_REQUESTED: "Re-upload Required",
    PENDING: "Pending",
  };
  return labels[status];
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
      const json = await apiClient.upload<{ url: string }>("/storage/upload", fd);
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-3 py-2.5 text-[12px] text-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-0.5">Reviewer remarks</p>
          <p className="text-amber-700 dark:text-amber-400">{existingDoc.remarks}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Document File <span className="text-destructive">*</span>
        </Label>
        <div
          className={cn(
            "rounded-lg border border-dashed p-6 transition-colors duration-200",
            fileError ? "border-rose-400 bg-rose-50 dark:bg-rose-950/10" : "border-border hover:border-muted-foreground/40"
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
                <p className="text-[11px] text-muted-foreground mt-0.5">PDF, DOC, DOCX, JPG, PNG — max 10 MB</p>
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
              className="text-[11px] text-muted-foreground hover:text-rose-500 underline block mx-auto mt-2 transition-colors duration-200"
              onClick={handleRemoveFile}
            >
              Remove file
            </button>
          )}
        </div>
        {fileError && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400" role="alert">
            {fileError}
          </p>
        )}
      </div>
    </HrSheet>
  );
}

interface EmployeeDocumentsTabProps {
  onBack?: () => void;
  onContinue?: () => void;
}

export function EmployeeDocumentsTab({ onBack, onContinue }: EmployeeDocumentsTabProps = {}) {
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
  const progressPct = checklist.length > 0 ? Math.round((approvedCount / checklist.length) * 100) : 0;
  const mandatoryUnsubmitted = checklist.some(
    (c) => c.docType.isMandatory && (!c.submission || c.submission.status === "RE_UPLOAD_REQUESTED"),
  );

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
      <div className="space-y-3 pt-2">
        <Skeleton className="h-12 rounded-2xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (checklist.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          illustration={<EmptyUploadIllustration className="h-24 w-24" />}
          title="No documents required"
          description="Your HR team hasn't configured any required documents yet."
          compact
        />
        {(onBack || onContinue) && (
          <DocumentsTabNav onBack={onBack} onContinue={onContinue} />
        )}
      </div>
    );
  }

  return (
    <>
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">Document Checklist</p>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {approvedCount} / {checklist.length} approved
            </span>
          </div>
          <Progress
            value={progressPct}
            className="h-1.5 [&>div]:bg-emerald-500 [&>div]:transition-all [&>div]:duration-500"
          />
          {progressPct === 100 && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              All documents approved
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {checklist.map(({ docType, submission }) => {
          const isApproved = submission?.status === "APPROVED";
          const status = submission?.status ?? "PENDING";
          return (
            <Card
              key={docType.id}
              className={cn(
                "rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 transition-colors duration-200",
                isApproved
                  ? "border-l-emerald-500"
                  : status === "SUBMITTED"
                    ? "border-l-amber-400"
                    : status === "REJECTED" || status === "RE_UPLOAD_REQUESTED"
                      ? "border-l-rose-400"
                      : "border-l-slate-300 dark:border-l-slate-600"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {docStatusIcon(status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isApproved && "line-through text-muted-foreground"
                        )}
                      >
                        {docType.name}
                      </p>
                      {docType.isMandatory && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700 shrink-0">
                          Required
                        </span>
                      )}
                      {submission && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                            docStatusBadgeClass(submission.status)
                          )}
                        >
                          {docStatusLabel(submission.status)}
                        </span>
                      )}
                    </div>

                    {docType.description && !isApproved && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {docType.description}
                      </p>
                    )}

                    {submission?.fileUrl && (
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline mt-0.5 transition-colors duration-200"
                        aria-label={`View ${submission.fileName}`}
                      >
                        {submission.fileName}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}

                    {submission?.reviewedAt && isApproved && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Approved {new Date(submission.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {submission.reviewerName && ` by ${submission.reviewerName}`}
                      </p>
                    )}

                    {submission?.status === "RE_UPLOAD_REQUESTED" && submission.remarks && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        Remarks: {submission.remarks}
                      </p>
                    )}
                  </div>

                  {canUpload(submission?.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0 gap-1.5 duration-200"
                      onClick={() => handleOpenUpload(docType, submission)}
                      aria-label={`Upload ${docType.name}`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {submission ? "Re-upload" : "Upload"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(onBack || onContinue) && (
        <div className="mt-4">
          <DocumentsTabNav onBack={onBack} onContinue={onContinue} continueDisabled={mandatoryUnsubmitted} />
        </div>
      )}

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

function DocumentsTabNav({
  onBack,
  onContinue,
  continueDisabled,
}: {
  onBack?: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
}) {
  return (
    <div className={onBack ? "flex justify-between" : "flex justify-end"}>
      {onBack && (
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      )}
      {onContinue && (
        <Button type="button" onClick={onContinue} disabled={continueDisabled}>
          Save & Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
