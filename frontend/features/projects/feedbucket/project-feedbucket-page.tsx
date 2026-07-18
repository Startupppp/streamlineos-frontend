"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";
import { CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { formatDistanceToNow } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { TEXT_BODY, TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyInboxIllustration, EmptyTicketIllustration } from "@/components/illustrations";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useFeedbucketWidgets,
  useCreateFeedbucketWidget,
  useUpdateFeedbucketWidget,
  useRotateFeedbucketWidgetKey,
  useFeedbucketSubmissions,
} from "@/hooks/api/feedbucket";
import type {
  FeedbucketSubmission,
  FeedbucketSubmissionType,
  FeedbucketSubmissionStatus,
  CreateFeedbucketWidgetInput,
} from "@/types/feedbucket";

const TYPE_LABELS: Record<FeedbucketSubmissionType, string> = {
  bug: "Bug",
  idea: "Idea",
  feature: "Feature",
  question: "Question",
  praise: "Praise",
  other: "Other",
};

const TYPE_VARIANTS: Record<FeedbucketSubmissionType, "default" | "secondary" | "outline" | "destructive"> = {
  bug: "destructive",
  idea: "default",
  feature: "secondary",
  question: "secondary",
  praise: "default",
  other: "outline",
};

const STATUS_VARIANTS: Record<FeedbucketSubmissionStatus, "default" | "secondary" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
  archived: "outline",
};

const STATUS_LABELS: Record<FeedbucketSubmissionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  archived: "Archived",
};

const PAGE_SIZE = 25;

function embedSnippet(publicKey: string): string {
  if (typeof window === "undefined") {
    return `<script src="/feedbucket-widget.js" data-key="${publicKey}" async></script>`;
  }
  return `<script src="${window.location.origin}/feedbucket-widget.js" data-key="${publicKey}" async></script>`;
}

interface CreateWidgetSheetProps {
  open: boolean;
  projectId: number;
  onClose: () => void;
}

function CreateWidgetSheet({ open, projectId, onClose }: CreateWidgetSheetProps) {
  const [name, setName] = useState("");
  const [aiAssistEnabled, setAiAssistEnabled] = useState(false);
  const createWidget = useCreateFeedbucketWidget();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: CreateFeedbucketWidgetInput = {
      name: name.trim(),
      projectId,
      allowedDomains: [],
      autoCreateTicket: false,
      defaultTicketType: "BUG",
      aiAssistEnabled,
    };
    try {
      await createWidget.mutateAsync(input);
      toast.success("Feedback widget created");
      setName("");
      setAiAssistEnabled(false);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Create Feedback Widget</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <SheetBody className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="widget-name">Widget name</Label>
              <Input
                id="widget-name"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Production feedback"
                required
              />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor="create-ai-assist" className="text-sm font-medium cursor-pointer">
                  AI assist in widget
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Let people submitting feedback draft a bug/feature with AI from their screenshot. Uses your org&apos;s AI credits; rate-limited.
                </p>
              </div>
              <Switch
                id="create-ai-assist"
                checked={aiAssistEnabled}
                onCheckedChange={setAiAssistEnabled}
                className="shrink-0 mt-0.5"
              />
            </div>
          </SheetBody>
          <SheetFooter className="px-6 py-4 border-t shrink-0">
            <div className="grid w-full grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <LoadingButton type="submit" isPending={createWidget.isPending} loadingText="Creating…">
                Create
              </LoadingButton>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

interface ProjectSubmissionsInboxProps {
  widgetId: number;
  projectId: number;
}

function ProjectSubmissionsInbox({ widgetId, projectId }: ProjectSubmissionsInboxProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useFeedbucketSubmissions({
    page,
    limit: PAGE_SIZE,
    widgetId,
  });

  const columns: DataTableColumn<FeedbucketSubmission>[] = [
    {
      key: "screenshot",
      header: "",
      cell: (row) =>
        row.screenshotUrl ? (
          <img
            src={row.screenshotUrl}
            alt="Screenshot"
            className="h-10 w-14 rounded border border-border object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-10 w-14 rounded border border-border bg-muted flex-shrink-0" />
        ),
      className: "w-[72px] pr-0",
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant={TYPE_VARIANTS[row.type]} className="text-xs">
          {TYPE_LABELS[row.type]}
        </Badge>
      ),
      className: "w-[90px]",
    },
    {
      key: "message",
      header: "Message",
      cell: (row) => (
        <TruncatedText text={row.message} lines={2} className="max-w-xs text-sm text-foreground" />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status]} className="text-xs">
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "w-[110px] hidden sm:table-cell",
    },
    {
      key: "age",
      header: "Age",
      cell: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
        </span>
      ),
      className: "hidden sm:table-cell w-[120px] text-right",
    },
  ];

  function handleRowClick(row: FeedbucketSubmission) {
    router.push(`/projects/${projectId}/feedbucket/${row.id}`);
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="Failed to load submissions." onRetry={refetch} />;
  }

  return (
    <DataTable
      data={data?.data ?? []}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={handleRowClick}
      pagination={{
        mode: "server",
        page,
        pageSize: PAGE_SIZE,
        total: data?.total ?? 0,
        onPageChange: setPage,
      }}
      emptyState={
        <EmptyState
          illustration={<EmptyInboxIllustration className="h-24 w-24" />}
          title="No submissions yet"
          description="Submissions from this widget will appear here once users submit feedback."
          className={PM_FILL_PANEL}
        />
      }
      rowClassName={() => "cursor-pointer"}
    />
  );
}

interface ProjectFeedbucketPageProps {
  projectId: number;
}

export function ProjectFeedbucketPage({ projectId }: ProjectFeedbucketPageProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const { data: widgets, isLoading: widgetsLoading, isError: widgetsError, refetch: refetchWidgets } = useFeedbucketWidgets();
  const rotateKey = useRotateFeedbucketWidgetKey();
  const updateWidget = useUpdateFeedbucketWidget();

  const projectWidget = widgets?.find((w) => w.projectId === projectId) ?? null;

  async function handleCopySnippet() {
    if (!projectWidget) return;
    await navigator.clipboard.writeText(embedSnippet(projectWidget.publicKey));
    toast.success("Embed snippet copied");
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleCloseCreate() {
    setCreateOpen(false);
  }

  function handleOpenRotate() {
    setConfirmRotate(true);
  }

  async function handleConfirmRotate() {
    if (!projectWidget) return;
    try {
      await rotateKey.mutateAsync(projectWidget.id);
      toast.success("Widget key rotated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
    setConfirmRotate(false);
  }

  async function handleToggleAiAssist(enabled: boolean) {
    if (!projectWidget) return;
    try {
      await updateWidget.mutateAsync({ widgetId: projectWidget.id, input: { aiAssistEnabled: enabled } });
      toast.success(enabled ? "AI assist enabled" : "AI assist disabled");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <DashboardGate permission="feedbucket:submissions:view">
      <PageWrapper
        title="Feedback"
        subtitle="Collect and triage user feedback submitted via this project's widget."
      >
        <PmPageShell>
        {widgetsLoading ? (
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : widgetsError ? (
          <ErrorState description="Failed to load widget." onRetry={refetchWidgets} />
        ) : !projectWidget ? (
          <EmptyState
              className={PM_FILL_PANEL}
              illustration={<EmptyTicketIllustration className="h-24 w-24" />}
              title="No feedback widget"
              description="Create a widget to embed on your product and start collecting feedback for this project."
              action={{ label: "Create feedback widget", onClick: handleOpenCreate }}
            />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            <PmSection index={0}>
              <PmPanel className="space-y-3 p-4" solid>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <TruncatedText text={projectWidget.name} className="text-sm font-medium" />
                      {projectWidget.aiAssistEnabled ? (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          AI assist
                        </Badge>
                      ) : null}
                    </div>
                    <p className={cn("text-xs text-muted-foreground", TEXT_ONE_LINE)}>
                      {projectWidget.isActive ? "Active" : "Inactive"} · Public key:{" "}
                      <span className="font-mono">{projectWidget.publicKey}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <AnimatedIconButton size="sm" variant="outline" icon={CopyIcon} iconSize={14} iconClassName="mr-1.5" onClick={handleCopySnippet}>
                      Copy snippet
                    </AnimatedIconButton>
                    <Button size="sm" variant="outline" onClick={handleOpenRotate}>
                      <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                      Rotate key
                    </Button>
                  </div>
                </div>
                <div className={cn("rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground", TEXT_BODY)}>
                  {embedSnippet(projectWidget.publicKey)}
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-background/60 px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className={cn("text-sm font-medium", TEXT_ONE_LINE)}>AI assist in widget</p>
                    <p className={cn("text-xs leading-relaxed text-muted-foreground", TEXT_BODY)}>
                      Let people submitting feedback draft a bug/feature with AI from their screenshot. Uses your org&apos;s AI credits; rate-limited.
                    </p>
                  </div>
                  <Switch
                    id="widget-ai-assist"
                    checked={projectWidget.aiAssistEnabled}
                    onCheckedChange={handleToggleAiAssist}
                    disabled={updateWidget.isPending}
                    className="mt-0.5 shrink-0"
                  />
                </div>
              </PmPanel>
            </PmSection>

            <PmSection index={1}>
              <p className={cn("mb-2 text-sm font-semibold text-foreground", TEXT_ONE_LINE)}>
                Submissions
              </p>
              <PmPanel className="p-0" solid>
                <ProjectSubmissionsInbox widgetId={projectWidget.id} projectId={projectId} />
              </PmPanel>
            </PmSection>
          </div>
        )}
        </PmPageShell>

        <CreateWidgetSheet
          open={createOpen}
          projectId={projectId}
          onClose={handleCloseCreate}
        />

        <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rotate widget key?</AlertDialogTitle>
              <AlertDialogDescription>
                The old key will stop working immediately. Update the embed snippet on your site.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRotate} disabled={rotateKey.isPending}>
                Rotate Key
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageWrapper>
    </DashboardGate>
  );
}
