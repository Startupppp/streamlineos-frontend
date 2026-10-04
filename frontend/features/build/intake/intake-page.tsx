"use client";

import { useState, useCallback } from "react";
import {
  useIntakeRequests,
  useCreateIntakeRequest,
} from "@/hooks/api/build/advanced";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ExternalLink } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { IntakeDecisionDialog } from "@/features/build/intake/components/intake-decision-dialog";
import { IntakeItemCard } from "@/features/build/intake/intake-item-card";
import { PmPageShell, PmSection, PmStaggerList } from "@/components/pm-chrome";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  createIntakeSchema,
  type CreateIntakeForm,
} from "@/features/build/intake/intake-schema";

const INTAKE_TAB_OPTIONS = ["pending", "accepted", "declined", "all"] as const;
const INTAKE_FILTER_DEFINITIONS = [
  { param: "tab", all: "pending", options: INTAKE_TAB_OPTIONS },
] as const;

export function IntakePage({ projectId }: { projectId: number }) {
  const [createOpen, setCreateOpen] = useState(false);
  const listFilters = useBuildListFilters({
    filters: INTAKE_FILTER_DEFINITIONS,
    withSearch: false,
  });
  const activeTab = listFilters.value("tab");

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
  const allItems = intakeData?.data ?? [];
  const filteredItems = allItems.filter(
    (item) => activeTab === "all" || item.status === activeTab,
  );
  const pendingCount = allItems.filter((i) => i.status === "pending").length;

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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyFormUrl}>
                <ExternalLink className="h-4 w-4 mr-1" /> Copy Form URL
              </Button>
              {canManage ? (
                <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                  <SheetTrigger asChild>
                    <Button size="sm">
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
            <Tabs
              value={activeTab}
              onValueChange={(value) => listFilters.setValue("tab", value)}
            >
              <PmSection index={0}>
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

              <TabsContent value={activeTab} className="mt-4">
                {filteredItems.length === 0 ? (
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
                        ? { label: "Create First Item", onClick: handleOpenCreate }
                        : undefined
                    }
                    className={CONTENT_FILL_PANEL}
                  />
                ) : (
                  <PmSection index={1}>
                    <PmStaggerList className="space-y-2.5">
                      {filteredItems.map((item) => (
                        <IntakeItemCard
                          key={item.id}
                          item={item}
                          canManage={canManage}
                          onAccept={onAccept}
                          onDecline={onDecline}
                          onDuplicate={onDuplicate}
                        />
                      ))}
                    </PmStaggerList>
                  </PmSection>
                )}
              </TabsContent>
            </Tabs>

          </PmPageShell>
        </PageWrapper>
      )}
    </IntakeDecisionDialog>
  );
}
