"use client";

import {
  forwardRef,
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  Circle,
  Upload,
  X,
  Eye,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { UploadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { HrSheet } from "@/features/hr/hr-sheet";
import { cn } from "@/lib/utils";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHrDocumentTypes,
  type HrDocumentType,
} from "@/hooks/api/hr/document-types";

type DocumentType = HrDocumentType;

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

interface OnboardingDocsResponse {
  data: OnboardingDoc[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function useMyOnboardingDocs() {
  return useQuery<OnboardingDoc[]>({
    queryKey: queryKeys.hr.myOnboardingDocs(),
    queryFn: async () => {
      const res = await apiClient.get<OnboardingDocsResponse>("/hr/onboarding-docs", { limit: 100 });
      return res.data;
    },
    staleTime: 60_000,
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
  if (status === "APPROVED") return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />;
  if (status === "SUBMITTED") return <Clock className="h-4 w-4 text-amber-500" />;
  if (status === "REJECTED") return <AlertCircle className="h-4 w-4 text-rose-500" />;
  if (status === "RE_UPLOAD_REQUESTED") return <RefreshCw className="h-4 w-4 text-amber-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

function docStatusBadgeClass(status: OnboardingDoc["status"]): string {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800";
  if (status === "SUBMITTED") return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800";
  if (status === "RE_UPLOAD_REQUESTED") return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800";
  return "bg-muted text-muted-foreground border-border";
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

type PendingFilesMap = ReadonlyMap<number, File>;

function validateDocumentFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return "Invalid file type. Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File size must be under 10 MB.";
  }
  return null;
}

function useBlobPreviewUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return url;
}

type FileRowActionProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

function FileRowAction({ icon: Icon, label, onClick, destructive }: FileRowActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground",
        destructive && "hover:text-destructive",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

type DocumentFileRowProps = {
  fileName: string;
  viewHref: string | null;
  pending?: boolean;
  onReplace?: () => void;
  onRemove?: () => void;
};

function DocumentFileRow({
  fileName,
  viewHref,
  pending = false,
  onReplace,
  onRemove,
}: DocumentFileRowProps) {
  const handleView = useCallback(() => {
    if (!viewHref) return;
    window.open(viewHref, "_blank", "noopener,noreferrer");
  }, [viewHref]);

  return (
    <div className="mt-1 flex min-w-0 items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1">
      <FileText className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      <TruncatedText
        text={fileName}
        className="min-w-0 flex-1 text-xs text-foreground"
        tooltip={fileName}
      />
      {pending ? (
        <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pending
        </span>
      ) : null}
      <div className="flex shrink-0 items-center divide-x divide-border/60">
        {viewHref ? (
          <FileRowAction icon={Eye} label="View" onClick={handleView} />
        ) : null}
        {onReplace ? (
          <FileRowAction icon={RefreshCw} label="Replace" onClick={onReplace} />
        ) : null}
        {onRemove ? (
          <FileRowAction icon={X} label="Remove" onClick={onRemove} destructive />
        ) : null}
      </div>
    </div>
  );
}

type DocumentChecklistRowProps = {
  docType: DocumentType;
  submission: OnboardingDoc | null;
  pendingFile: File | null;
  isWizard: boolean;
  onPickFile: (docType: DocumentType) => void;
  onRemovePending: (documentTypeId: number) => void;
  onOpenUpload: (docType: DocumentType, existing: OnboardingDoc | null) => void;
};

function DocumentChecklistRow({
  docType,
  submission,
  pendingFile,
  isWizard,
  onPickFile,
  onRemovePending,
  onOpenUpload,
}: DocumentChecklistRowProps) {
  const isApproved = submission?.status === "APPROVED";
  const status = submission?.status ?? "PENDING";
  const showFileRow = Boolean(pendingFile) || Boolean(submission?.fileUrl);
  const showUploadAction = canUpload(submission?.status) && !showFileRow;
  const blobUrl = useBlobPreviewUrl(isWizard && pendingFile ? pendingFile : null);

  const handleReplace = useCallback(() => {
    if (isWizard) {
      onPickFile(docType);
      return;
    }
    onOpenUpload(docType, submission);
  }, [docType, isWizard, onOpenUpload, onPickFile, submission]);

  const handleRemovePending = useCallback(() => {
    onRemovePending(docType.id);
  }, [docType.id, onRemovePending]);

  const handleUploadClick = useCallback(() => {
    if (isWizard) {
      onPickFile(docType);
      return;
    }
    onOpenUpload(docType, submission);
  }, [docType, isWizard, onOpenUpload, onPickFile, submission]);

  const fileName = pendingFile?.name ?? submission?.fileName ?? "";
  const viewHref = pendingFile ? blobUrl : submission?.fileUrl ?? null;
  const canReplace = canUpload(submission?.status) && !isApproved;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 border-l-4 transition-colors duration-200",
        isWizard
          ? "bg-card/60"
          : "rounded-2xl bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)]",
        isApproved
          ? "border-l-emerald-500"
          : status === "SUBMITTED"
            ? "border-l-amber-400"
            : status === "REJECTED" || status === "RE_UPLOAD_REQUESTED"
              ? "border-l-rose-400"
              : "border-l-border",
      )}
    >
      <div className="px-2.5 py-2 sm:px-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">{docStatusIcon(status)}</div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <TruncatedText
                    text={docType.name}
                    lines={2}
                    className={cn(
                      "text-sm font-medium text-foreground",
                      isApproved && "text-muted-foreground line-through",
                    )}
                  />
                  {docType.isMandatory ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground">
                      Required
                    </span>
                  ) : null}
                  {submission ? (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-semibold",
                        docStatusBadgeClass(submission.status),
                      )}
                    >
                      {docStatusLabel(submission.status)}
                    </span>
                  ) : null}
                </div>
              </div>

              {showUploadAction ? (
                <AnimatedIconButton
                  icon={UploadIcon}
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 gap-1 px-2 text-xs duration-200 sm:px-2.5"
                  onClick={handleUploadClick}
                  aria-label={`Upload ${docType.name}`}
                >
                  <span className="hidden sm:inline">Upload</span>
                </AnimatedIconButton>
              ) : null}
            </div>

            {docType.description && !isApproved ? (
              <TruncatedText
                text={docType.description}
                lines={2}
                className="mt-0.5 text-xs text-muted-foreground"
              />
            ) : null}

            {showFileRow && fileName ? (
              <DocumentFileRow
                fileName={fileName}
                viewHref={viewHref}
                pending={Boolean(isWizard && pendingFile)}
                onReplace={canReplace ? handleReplace : undefined}
                onRemove={isWizard && pendingFile ? handleRemovePending : undefined}
              />
            ) : null}

            {submission?.reviewedAt && isApproved ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Approved{" "}
                {new Date(submission.reviewedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {submission.reviewerName ? ` by ${submission.reviewerName}` : ""}
              </p>
            ) : null}

            {submission?.status === "RE_UPLOAD_REQUESTED" && submission.remarks ? (
              <TruncatedText
                text={`Remarks: ${submission.remarks}`}
                lines={2}
                className="mt-0.5 text-xs text-amber-600 dark:text-amber-300"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export type EmployeeDocumentsTabHandle = {
  submitPendingUploads: () => Promise<void>;
};

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
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-900 px-3 py-2.5 text-[12px] text-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-0.5">Reviewer remarks</p>
          <p className="text-amber-700 dark:text-amber-300">{existingDoc.remarks}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Document File <span className="text-destructive">*</span>
        </Label>
        <div
          className={cn(
            "rounded-lg border border-dashed p-6 transition-colors duration-200",
            fileError ? "border-rose-400 bg-rose-50 dark:bg-rose-500/10" : "border-border hover:border-muted-foreground/40"
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
          <p className="text-[11px] text-rose-600 dark:text-rose-300" role="alert">
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
  variant?: "default" | "wizard";
  hideNav?: boolean;
  countryCode?: string;
  onCanContinueChange?: (canContinue: boolean) => void;
}

export const EmployeeDocumentsTab = forwardRef<
  EmployeeDocumentsTabHandle,
  EmployeeDocumentsTabProps
>(function EmployeeDocumentsTab(
  {
    onBack,
    onContinue,
    variant = "default",
    hideNav = false,
    countryCode,
    onCanContinueChange,
  },
  ref,
) {
  const qc = useQueryClient();
  const { data: myDocs, isLoading: docsLoading } = useMyOnboardingDocs();
  const { data: docTypes, isLoading: typesLoading } = useHrDocumentTypes();
  const submitDoc = useSubmitOnboardingDoc();

  const [uploadTarget, setUploadTarget] = useState<DocumentType | null>(null);
  const [uploadExisting, setUploadExisting] = useState<OnboardingDoc | null>(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFilesMap>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickTargetRef = useRef<DocumentType | null>(null);

  const isLoading = docsLoading || typesLoading;
  const isWizard = variant === "wizard";

  const checklist = (() => {
    const country = countryCode?.toUpperCase();
    const types = (docTypes ?? []).filter(
      (dt) =>
        dt.isActive !== false &&
        (!country || !dt.countryCode || dt.countryCode.toUpperCase() === country),
    );
    const docsByTypeId = new Map((myDocs ?? []).map((d) => [d.documentTypeId, d]));
    return types.map((dt) => ({
      docType: dt,
      submission: docsByTypeId.get(dt.id) ?? null,
    }));
  })();

  const approvedCount = checklist.filter((c) => c.submission?.status === "APPROVED").length;
  const progressPct = checklist.length > 0 ? Math.round((approvedCount / checklist.length) * 100) : 0;
  const mandatoryUnsubmitted = checklist.some((c) => {
    if (!c.docType.isMandatory) return false;
    if (pendingFiles.has(c.docType.id)) return false;
    if (!c.submission) return true;
    return (
      c.submission.status === "RE_UPLOAD_REQUESTED" ||
      c.submission.status === "REJECTED"
    );
  });

  useEffect(() => {
    onCanContinueChange?.(!mandatoryUnsubmitted);
  }, [mandatoryUnsubmitted, onCanContinueChange]);

  const handleOpenUpload = useCallback((dt: DocumentType, existing: OnboardingDoc | null) => {
    setUploadTarget(dt);
    setUploadExisting(existing);
    setUploadSheetOpen(true);
  }, []);

  const handlePickFile = useCallback((dt: DocumentType) => {
    pickTargetRef.current = dt;
    fileInputRef.current?.click();
  }, []);

  const handlePendingFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      e.target.value = "";
      const target = pickTargetRef.current;
      if (!file || !target) return;
      const validationError = validateDocumentFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      setPendingFiles((prev) => {
        const next = new Map(prev);
        next.set(target.id, file);
        return next;
      });
      pickTargetRef.current = null;
    },
    [],
  );

  const handleRemovePending = useCallback((documentTypeId: number) => {
    setPendingFiles((prev) => {
      const next = new Map(prev);
      next.delete(documentTypeId);
      return next;
    });
  }, []);

  const submitPendingUploads = useCallback(async () => {
    const entries = Array.from(pendingFiles.entries());
    if (entries.length === 0) return;

    for (const [documentTypeId, file] of entries) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "onboarding-docs");
      const uploadResult = await apiClient.upload<{ url: string }>("/storage/upload", fd);
      await apiClient.post("/hr/onboarding-docs", {
        documentTypeId,
        fileUrl: uploadResult.url,
        fileName: file.name,
      });
    }

    await qc.invalidateQueries({ queryKey: queryKeys.hr.myOnboardingDocs() });
    setPendingFiles(new Map());
  }, [pendingFiles, qc]);

  useImperativeHandle(ref, () => ({ submitPendingUploads }), [submitPendingUploads]);

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
          <Skeleton key={i} className="h-14 rounded-xl" />
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
        {!hideNav && (onBack || onContinue) ? (
          <DocumentsTabNav onBack={onBack} onContinue={onContinue} />
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "mb-3 overflow-hidden rounded-xl border border-border/70",
          isWizard ? "bg-card/60" : "rounded-2xl bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)]",
        )}
      >
        <div className={cn("p-3.5", !isWizard && "p-4")}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10">
                <FileText className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Document checklist
              </p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {approvedCount} / {checklist.length} approved
            </span>
          </div>
          <Progress
            value={progressPct}
            className="h-1.5 [&>div]:bg-emerald-500 [&>div]:transition-all [&>div]:duration-500"
          />
          {progressPct === 100 ? (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              All documents approved
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        {checklist.map(({ docType, submission }) => (
          <DocumentChecklistRow
            key={docType.id}
            docType={docType}
            submission={submission}
            pendingFile={pendingFiles.get(docType.id) ?? null}
            isWizard={isWizard}
            onPickFile={handlePickFile}
            onRemovePending={handleRemovePending}
            onOpenUpload={handleOpenUpload}
          />
        ))}
      </div>

      {!hideNav && (onBack || onContinue) ? (
        <div className="mt-4">
          <DocumentsTabNav
            onBack={onBack}
            onContinue={onContinue}
            continueDisabled={mandatoryUnsubmitted}
          />
        </div>
      ) : null}

      {isWizard ? (
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={handlePendingFileChange}
        />
      ) : null}

      {!isWizard ? (
        <UploadSheet
          open={uploadSheetOpen}
          onOpenChange={setUploadSheetOpen}
          documentType={uploadTarget}
          existingDoc={uploadExisting}
          onSubmit={handleSubmit}
          isPending={submitDoc.isPending}
        />
      ) : null}
    </>
  );
});

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
