"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Settings,
  ClipboardCheck,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  UserPlus,
  Users,
  TrendingUp,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration, EmptyUploadIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { HrSheet } from "@/features/hr/hr-sheet";
import { OnboardingWizard } from "@/components/hr/onboarding-wizard";

import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useOnboardingStatus,
  useInitiateOnboarding,
  type OnboardingStatus,
} from "@/lib/api/hooks/hr/onboarding";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useMyOnboardingDocs() {
  return useQuery<OnboardingDoc[]>({
    queryKey: ["hr", "my-onboarding-docs"],
    queryFn: () => apiClient.get<OnboardingDoc[]>("/hr/onboarding-docs"),
  });
}

function useDocumentTypes() {
  return useQuery<DocumentType[]>({
    queryKey: ["hr", "document-types"],
    queryFn: () => apiClient.get<DocumentType[]>("/hr/document-types"),
  });
}

function useSubmitOnboardingDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      documentTypeId: number;
      fileUrl: string;
      fileName: string;
    }) => apiClient.post("/hr/onboarding-docs", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "my-onboarding-docs"] });
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docStatusIcon(status: OnboardingDoc["status"]) {
  switch (status) {
    case "APPROVED":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "SUBMITTED":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "REJECTED":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "RE_UPLOAD_REQUESTED":
      return <RefreshCw className="h-4 w-4 text-orange-500" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
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
      return "Under Review";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "RE_UPLOAD_REQUESTED":
      return "Re-upload Required";
  }
}

function canUpload(status: OnboardingDoc["status"] | undefined): boolean {
  return !status || status === "PENDING" || status === "RE_UPLOAD_REQUESTED" || status === "REJECTED";
}

// ─── Document Upload Sheet ────────────────────────────────────────────────────

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
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const handleSubmit = useCallback(() => {
    if (!fileUrl.trim()) {
      toast.error("Please enter a file URL");
      return;
    }
    if (!fileName.trim()) {
      toast.error("Please enter a file name");
      return;
    }
    onSubmit(fileUrl.trim(), fileName.trim());
  }, [fileUrl, fileName, onSubmit]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setFileUrl("");
        setFileName("");
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={
        existingDoc
          ? `Re-upload: ${documentType?.name}`
          : `Upload: ${documentType?.name}`
      }
      description={
        documentType?.description ??
        "Submit this document as part of your onboarding checklist."
      }
      onSubmit={handleSubmit}
      submitLabel="Submit Document"
      isPending={isPending}
    >
      {/* Upload note */}
      <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-[12px] text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground mb-0.5">How to upload</p>
        <p>
          Upload your file via the{" "}
          <strong>Files</strong> section (HR &rarr; Documents), then copy the
          file URL and paste it below.
        </p>
      </div>

      {/* If re-upload requested, show remarks */}
      {existingDoc?.status === "RE_UPLOAD_REQUESTED" && existingDoc.remarks && (
        <div className="rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 px-3 py-2.5 text-[12px] text-orange-800 dark:text-orange-300">
          <p className="font-medium mb-0.5">Reviewer remarks</p>
          <p>{existingDoc.remarks}</p>
        </div>
      )}

      <Separator />

      {/* File URL */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          File URL <span className="text-destructive">*</span>
        </Label>
        <Input
          type="url"
          placeholder="https://..."
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          aria-label="File URL"
        />
      </div>

      {/* File name */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          File Name <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="e.g. aadhaar-card.pdf"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          aria-label="File name"
        />
        <p className="text-[11px] text-muted-foreground">
          Include the file extension (e.g. .pdf, .jpg, .png).
        </p>
      </div>
    </HrSheet>
  );
}

// ─── Employee Documents Tab ───────────────────────────────────────────────────

function EmployeeDocumentsTab() {
  const { data: myDocs, isLoading: docsLoading } = useMyOnboardingDocs();
  const { data: docTypes, isLoading: typesLoading } = useDocumentTypes();
  const submitDoc = useSubmitOnboardingDoc();

  const [uploadTarget, setUploadTarget] = useState<DocumentType | null>(null);
  const [uploadExisting, setUploadExisting] = useState<OnboardingDoc | null>(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  const isLoading = docsLoading || typesLoading;

  // Build merged checklist: all active doc types + match existing submissions
  const checklist = (() => {
    const types = (docTypes ?? []).filter((dt) => dt.isActive !== false);
    const docsByTypeId = new Map(
      (myDocs ?? []).map((d) => [d.documentTypeId, d])
    );
    return types.map((dt) => ({
      docType: dt,
      submission: docsByTypeId.get(dt.id) ?? null,
    }));
  })();

  const approvedCount = checklist.filter(
    (c) => c.submission?.status === "APPROVED"
  ).length;

  const handleOpenUpload = useCallback(
    (dt: DocumentType, existing: OnboardingDoc | null) => {
      setUploadTarget(dt);
      setUploadExisting(existing);
      setUploadSheetOpen(true);
    },
    []
  );

  const handleSubmit = useCallback(
    (fileUrl: string, fileName: string) => {
      if (!uploadTarget) return;
      submitDoc.mutate(
        {
          documentTypeId: uploadTarget.id,
          fileUrl,
          fileName,
        },
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
      {/* Progress summary */}
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 mb-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <p className="text-sm">
          <span className="font-semibold">{approvedCount}</span> of{" "}
          <span className="font-semibold">{checklist.length}</span> documents
          approved
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
                      <Badge
                        variant="default"
                        className="text-[9px] py-0 h-4 shrink-0"
                      >
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

                  {/* Existing file link */}
                  {submission?.fileUrl && (
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                      aria-label={`View ${submission.fileName}`}
                    >
                      {submission.fileName}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}

                  {/* Reviewer remarks for re-upload */}
                  {submission?.status === "RE_UPLOAD_REQUESTED" &&
                    submission.remarks && (
                      <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">
                        Remarks: {submission.remarks}
                      </p>
                    )}
                </div>

                {/* Upload button */}
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

// ─── HR Workflow Tab ─────────────────────────────────────────────────────────

function InitiateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [userId, setUserId] = useState("");
  const initiate = useInitiateOnboarding();

  const handleSubmit = useCallback(() => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }
    initiate.mutate(userId.trim(), {
      onSuccess: (data) => {
        toast.success(`Onboarding initiated — ${data.tasksCreated} tasks created`);
        setUserId("");
        onOpenChange(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [userId, initiate, onOpenChange]);

  return (
    <HrSheet
      open={open}
      onOpenChange={(v) => {
        if (!v) setUserId("");
        onOpenChange(v);
      }}
      title="Initiate Onboarding"
      description="Create an onboarding checklist for an employee using the active template."
      onSubmit={handleSubmit}
      submitLabel="Start Onboarding"
      isPending={initiate.isPending}
    >
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Employee User ID <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="user_..."
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          aria-label="Employee user ID"
        />
        <p className="text-[11px] text-muted-foreground">
          Enter the internal user ID of the employee to onboard.
        </p>
      </div>
    </HrSheet>
  );
}

function stalledBadge(row: OnboardingStatus): boolean {
  if (row.percentComplete >= 100) return false;
  if (!row.lastCompletedAt) return false;
  const last = new Date(row.lastCompletedAt).getTime();
  return Date.now() - last > 48 * 60 * 60 * 1000;
}

function HrWorkflowTab() {
  const { data, isLoading } = useOnboardingStatus();
  const [initiateOpen, setInitiateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length > 0
            ? `${rows.length} employee${rows.length !== 1 ? "s" : ""} in onboarding`
            : "No active onboardings yet."}
        </p>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setInitiateOpen(true)}
          aria-label="Initiate onboarding for an employee"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Initiate Onboarding
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-24 w-24" />}
          title="No onboardings in progress"
          description="Use the button above to start onboarding for a new hire."
          compact
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card key={row.userId}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p className="text-sm font-medium truncate">{row.userName}</p>
                      {row.percentComplete === 100 && (
                        <Badge className="text-[10px] shrink-0" variant="default">
                          Complete
                        </Badge>
                      )}
                      {stalledBadge(row) && (
                        <Badge className="text-[10px] shrink-0" variant="destructive">
                          Stalled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={row.percentComplete} className="h-1.5 flex-1" />
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {row.completedTasks}/{row.totalTasks}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    asChild
                  >
                    <Link href={`/hr/onboarding/${row.userId}`} aria-label={`View ${row.userName} onboarding`}>
                      <TrendingUp className="h-3.5 w-3.5 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InitiateSheet open={initiateOpen} onOpenChange={setInitiateOpen} />
    </div>
  );
}

// ─── HR / CEO Documents Tab ───────────────────────────────────────────────────

function HrDocumentsTab() {
  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm text-muted-foreground">
        Manage onboarding document configuration and review employee submissions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Configure Document Types</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Define which documents employees must submit during onboarding.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                <Link href="/hr/document-types">
                  Configure Document Types →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Review Documents</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                View and approve documents submitted by employees during onboarding.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                <Link href="/hr/document-review">
                  Review Documents →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isHROrCEO = role === "HR" || role === "CEO";

  return (
    <PageWrapper
      title="Onboarding"
      subtitle={
        isHROrCEO
          ? "Onboard new team members and manage document requirements"
          : "Complete your onboarding steps"
      }
      noInternalScroll={!isHROrCEO}
      actions={
        isHROrCEO ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Employees
            </Link>
          </Button>
        ) : undefined
      }
    >
      {isHROrCEO ? (
        <Tabs defaultValue="workflow" className="space-y-4">
          <TabsList className="h-8">
            <TabsTrigger value="workflow" className="text-xs h-7 px-3">
              Workflow
            </TabsTrigger>
            <TabsTrigger value="wizard" className="text-xs h-7 px-3">
              New Employee
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs h-7 px-3">
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-0">
            <HrWorkflowTab />
          </TabsContent>

          <TabsContent value="wizard" className="mt-0">
            <OnboardingWizard />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <HrDocumentsTab />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="checklist" className="flex flex-col flex-1 min-h-0">
          <TabsList className="h-8 shrink-0">
            <TabsTrigger value="checklist" className="text-xs h-7 px-3">
              My Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="mt-3 flex-1 overflow-auto pb-6">
            <EmployeeDocumentsTab />
          </TabsContent>
        </Tabs>
      )}
    </PageWrapper>
  );
}
