"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  useIntakeRequests,
  useCreateIntakeRequest,
} from "@/hooks/api/build/intake";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CONTENT_FILL_PANEL,
  PAGE_BODY_EMPTY_CLASS,
} from "@/components/ui/content-fill-panel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetBody,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { Plus, ExternalLink, ListChecks } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { IntakeDecisionDialog } from "@/features/build/intake/components/intake-decision-dialog";
import { IntakeItemCard } from "@/features/build/intake/intake-item-card";
import { IntakeTriageMode } from "@/features/build/intake/intake-triage-mode";
import { PmPageShell, PmSection, PmStaggerList } from "@/components/pm-chrome";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  createIntakeSchema,
  type CreateIntakeForm,
} from "@/features/build/intake/intake-schema";

const INTAKE_TAB_OPTIONS = ["pending", "accepted", "declined", "all"] as const;
const INTAKE_MODE_OPTIONS = ["triage"] as const;
const INTAKE_FILTER_DEFINITIONS = [
  { param: "tab", all: "pending", options: INTAKE_TAB_OPTIONS },
  { param: "mode", all: "list", options: INTAKE_MODE_OPTIONS },
] as const;

export function IntakePage({
  projectId,
  highlightId,
  highlightRequested = highlightId !== undefined,
}: {
  projectId: number;
  highlightId?: number;
  highlightRequested?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);
  const listFilters = useBuildListFilters({
    filters: INTAKE_FILTER_DEFINITIONS,
    withSearch: false,
  });
  const activeTab = listFilters.value("tab");
  const triageMode = listFilters.value("mode") === "triage";

  const {
    data: intakeData,
    isLoading,
    isError,
    error,
    refetch,
  } = useIntakeRequests(projectId);
  const createMutation = useCreateIntakeRequest();

  const createForm = useForm<CreateIntakeForm>({
    resolver: zodResolver(createIntakeSchema),
  });
  useRegisterDirtyState(createOpen && createForm.formState.isDirty);

  const onCreateSubmit = useCallback(
    (data: CreateIntakeForm) => {
      createMutation.mutate(
        { ...data, projectId },
        {
          onSuccess: () => {
            setCreateOpen(false);
            createForm.reset();
            toast.success("Intake item created");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, projectId, createForm],
  );

  const canManage = useCan("build:workspace:manage");
  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleCopyFormUrl = useCallback(() => {
    const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/intake/${projectId}`;
    navigator.clipboard.writeText(formUrl);
    toast.success("Form URL copied to clipboard");
  }, [projectId]);

  function handleOpenCreate(): void {
    setCreateOpen(true);
  }
  function handleCloseCreate(): void {
    setCreateOpen(false);
  }
  function handleEnterTriage(): void {
    listFilters.setValue("mode", "triage");
  }
  function handleExitTriage(): void {
    listFilters.setValue("mode", "list");
  }
  const allItems = intakeData?.data ?? [];

  const highlightedItem =
    highlightId !== undefined
      ? (allItems.find((i) => i.id === highlightId) ?? null)
      : null;
  const highlightFound = highlightedItem !== null;
  const listSettled = !isLoading && intakeData !== undefined;
  const highlightNotFound =
    highlightRequested && listSettled && highlightedItem === null;

  useEffect(() => {
    if (
      highlightFound &&
      highlightedItem !== null &&
      activeTab !== "all" &&
      highlightedItem.status !== activeTab
    ) {
      listFilters.setValue("tab", "all");
    }
  }, [highlightFound, highlightedItem, activeTab, listFilters]);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  }, [highlightFound]);

  const filteredItems = allItems.filter(
    (item) => activeTab === "all" || item.status === activeTab,
  );
  const pendingItems = allItems.filter((i) => i.status === "pending");
  const pendingCount = pendingItems.length;

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "loading"
  )
    return (
      <PageWrapper
        title="Intake"
        subtitle="Collect and triage incoming requests from your team or clients"
      >
        <PmPageShell>
          <PageState
            resolution={pageState}
            loading={null}
            onRetry={handleRetry}
          >
            {null}
          </PageState>
        </PmPageShell>
      </PageWrapper>
    );

  if (pageState.kind === "loading")
    return (
      <PageWrapper
        title="Intake"
        subtitle="Collect and triage incoming requests from your team or clients"
      >
        <PmPageShell>
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </PmPageShell>
      </PageWrapper>
    );

  return (
    <IntakeDecisionDialog projectId={projectId}>
      {({ onAccept, onDecline, onDuplicate }) => (
        <PageWrapper
          title="Intake"
          subtitle="Collect and triage incoming requests from your team or clients"
          actions={
            <div className="flex w-full flex-wrap items-center gap-2">
              {canManage && !triageMode ? (
                <Button variant="outline" size="sm" onClick={handleEnterTriage}>
                  <ListChecks className="h-4 w-4 mr-1" /> Triage
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={handleCopyFormUrl}>
                <ExternalLink className="h-4 w-4 mr-1" />
                <span className="max-[380px]:hidden">Copy Form URL</span>
                <span className="min-[381px]:hidden">Form URL</span>
              </Button>
              {canManage && !triageMode ? (
                <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                  <SheetTrigger asChild>
                    <Button size="sm" aria-label="New Item" className="shrink-0">
                      <Plus className="h-4 w-4 mr-1" /> New Item
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="sm:max-w-md p-0 flex flex-col gap-0"
                  >
                    <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
                      <SheetTitle>Create Intake Item</SheetTitle>
                      <SheetDescription>
                        Capture a request so it can be reviewed and triaged into
                        project work.
                      </SheetDescription>
                    </SheetHeader>
                    <SheetBody className="px-6 py-5">
                      <form
                        id="create-intake-form"
                        onSubmit={createForm.handleSubmit(onCreateSubmit)}
                        className="space-y-4"
                      >
                        <div>
                          <Label htmlFor="intake-title">Title</Label>
                          <Input
                            id="intake-title"
                            {...createForm.register("title")}
                          />
                          {createForm.formState.errors.title && (
                            <p
                              className="text-xs text-destructive mt-1"
                              aria-live="polite"
                            >
                              {createForm.formState.errors.title.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="intake-desc">Description</Label>
                          <Textarea
                            id="intake-desc"
                            {...createForm.register("description")}
                          />
                        </div>
                      </form>
                    </SheetBody>
                    <div className="shrink-0 px-6 py-4 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCloseCreate}
                        >
                          Cancel
                        </Button>
                        <LoadingButton
                          size="sm"
                          type="submit"
                          form="create-intake-form"
                          isPending={createMutation.isPending}
                          loadingText="Creating…"
                        >
                          Create Item
                        </LoadingButton>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : null}
            </div>
          }
        >
          <PmPageShell>
            {triageMode && canManage ? (
              <IntakeTriageMode
                items={pendingItems}
                onAccept={onAccept}
                onDecline={onDecline}
                onDuplicate={onDuplicate}
                onExit={handleExitTriage}
              />
            ) : null}
            {(!triageMode || !canManage) ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => listFilters.setValue("tab", value)}
              className="flex min-h-0 flex-1 flex-col gap-0"
            >
              <PmSection index={0} className="shrink-0">
                <TabsList>
                  <TabsTrigger value="pending">
                    Pending
                    {pendingCount > 0 ? (
                      <Badge
                        variant="secondary"
                        className="ml-1.5 h-5 px-1.5 text-xs"
                      >
                        {pendingCount}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="accepted">Accepted</TabsTrigger>
                  <TabsTrigger value="declined">Declined</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </PmSection>

              <TabsContent
                value={activeTab}
                className={`${TABS_CONTENT_PAGE_BODY_CLASS} mt-4 min-h-0 flex-1 max-md:pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]`}
              >
                {highlightNotFound ? (
                  <p
                    className="mb-3 shrink-0 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning-foreground"
                    role="status"
                    data-testid="intake-item-not-found"
                  >
                    The linked item is not in this view. It may have been
                    deleted or moved to a different status.
                  </p>
                ) : null}
                {filteredItems.length === 0 ? (
                  <div
                    data-testid="intake-empty-panel"
                    className={`${CONTENT_FILL_PANEL} ${PAGE_BODY_EMPTY_CLASS}`}
                  >
                    <EmptyState
                      illustration={<EmptyInboxIllustration />}
                      title={
                        activeTab === "pending"
                          ? "No pending items"
                          : `No ${activeTab} items`
                      }
                      description={
                        activeTab === "pending"
                          ? "Share the form URL to start receiving submissions."
                          : "Items will appear here once triaged."
                      }
                      action={
                        activeTab === "pending"
                          ? {
                              label: "Create First Item",
                              onClick: handleOpenCreate,
                            }
                          : undefined
                      }
                      className={`${CONTENT_FILL_PANEL} ${PAGE_BODY_EMPTY_CLASS}`}
                    />
                  </div>
                ) : (
                  <PmSection index={1} className="min-h-0 flex-1">
                    <PmStaggerList className="space-y-2.5 pb-2">
                      {filteredItems.map((item) => {
                        const isHighlighted = item.id === highlightId;
                        return (
                          <div
                            key={item.id}
                            ref={isHighlighted ? highlightRef : undefined}
                            className={
                              isHighlighted
                                ? "ring-2 ring-primary ring-offset-2 rounded-xl"
                                : undefined
                            }
                            data-highlighted={
                              isHighlighted ? "true" : undefined
                            }
                          >
                            <IntakeItemCard
                              item={item}
                              canManage={canManage}
                              onAccept={onAccept}
                              onDecline={onDecline}
                              onDuplicate={onDuplicate}
                            />
                          </div>
                        );
                      })}
                    </PmStaggerList>
                  </PmSection>
                )}
              </TabsContent>
            </Tabs>
            ) : null}
          </PmPageShell>
        </PageWrapper>
      )}
    </IntakeDecisionDialog>
  );
}
