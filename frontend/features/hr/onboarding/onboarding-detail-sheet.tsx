"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrDocumentTypes } from "@/hooks/api/hr/document-types";

import {
  DocumentChecklistRow,
  type DocumentType,
  type OnboardingDoc,
} from "./onboarding-document-checklist-row";
import { UploadSheet, ACCEPTED_EXTENSIONS, validateDocumentFile } from "./onboarding-upload-sheet";

interface OnboardingDocsResponse {
  data: OnboardingDoc[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

function useMyOnboardingDocs() {
  return useQuery<OnboardingDoc[]>({
    queryKey: queryKeys.hr.myOnboardingDocs(),
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<OnboardingDocsResponse>("/hr/onboarding-docs", { limit: 100 }, signal);
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

export type EmployeeDocumentsTabHandle = {
  submitPendingUploads: () => Promise<void>;
};

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
  const [pendingFiles, setPendingFiles] = useState<ReadonlyMap<number, File>>(new Map());
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
      const uploadResult = await apiClient.upload<{ key: string }>("/storage/upload", fd);
      await apiClient.post("/hr/onboarding-docs", {
        documentTypeId,
        fileUrl: uploadResult.key,
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
        },
      );
    },
    [uploadTarget, submitDoc],
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
          isWizard
            ? "bg-card/60"
            : "rounded-2xl bg-card/90 backdrop-blur-sm shadow-card",
        )}
      >
        <div className={cn("p-3.5", !isWizard && "p-4")}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex w-7 items-center justify-center rounded-lg bg-status-success-surface">
                <FileText className="h-3.5 w-3.5 text-status-success-ink" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Document checklist
              </p>
            </div>
            <span className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
              {approvedCount} / {checklist.length} approved
            </span>
          </div>
          <Progress
            value={progressPct}
            className="h-1.5 [&>div]:bg-status-success-fill [&>div]:transition-all [&>div]:duration-500"
          />
          {progressPct === 100 ? (
            <p className="mt-1.5 flex items-center gap-1 text-dense font-semibold text-status-success-ink">
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
