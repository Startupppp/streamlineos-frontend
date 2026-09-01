"use client";

import { useState, useCallback } from "react";
import {
  useIntakeRequests, useCreateIntakeRequest, useUpdateIntakeRequest,
  useProjectMembers, useCycles, useModules,
} from "@/hooks/api/build";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetBody } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ExternalLink } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/lib/person-display";
import { useForm, Controller, useController } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { IntakeItemCard } from "@/features/build/intake/intake-item-card";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
} from "@/features/build/shared/pm-chrome";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  createIntakeSchema,
  type CreateIntakeForm,
  acceptSchema,
  type AcceptForm,
} from "@/features/build/intake/intake-schema";

const declineSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});
type DeclineForm = z.infer<typeof declineSchema>;

const WORK_STATES = ["backlog", "todo", "in_progress", "done", "cancelled"] as const;

export function IntakePage({ projectId }: { projectId: number }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: intakeData, isLoading } = useIntakeRequests(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: cycles } = useCycles(projectId);
  const { data: modules } = useModules(projectId);

  const createMutation = useCreateIntakeRequest();
  const updateMutation = useUpdateIntakeRequest();

  const createForm = useForm<CreateIntakeForm>({ resolver: zodResolver(createIntakeSchema) });
  const acceptForm = useForm<AcceptForm>({ resolver: zodResolver(acceptSchema) });
  const declineForm = useForm<DeclineForm>({ resolver: zodResolver(declineSchema) });

  const { field: assigneeIdField } = useController({ control: acceptForm.control, name: "assigneeId" });
  const { field: cycleIdField } = useController({ control: acceptForm.control, name: "cycleId" });
  const { field: moduleIdField } = useController({ control: acceptForm.control, name: "moduleId" });

  const handleAssigneeChange = useCallback(
    (v: string) => assigneeIdField.onChange(v || undefined),
    [assigneeIdField]
  );
  const handleCycleChange = useCallback(
    (v: string) => cycleIdField.onChange(v ? parseInt(v) : undefined),
    [cycleIdField]
  );
  const handleModuleChange = useCallback(
    (v: string) => moduleIdField.onChange(v ? parseInt(v) : undefined),
    [moduleIdField]
  );

  const onCreateSubmit = useCallback((data: CreateIntakeForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          createForm.reset();
          toast.success("Intake item created");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createMutation, projectId, createForm]);

  const onAcceptSubmit = useCallback((_: AcceptForm) => {
    if (selectedItemId === null) return;
    updateMutation.mutate(
      { id: selectedItemId, projectId, status: "accepted" },
      {
        onSuccess: () => {
          setAcceptOpen(false);
          acceptForm.reset();
          toast.success("Item accepted and work item created");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [selectedItemId, updateMutation, projectId, acceptForm]);

  const onDeclineSubmit = useCallback((data: DeclineForm) => {
    if (selectedItemId === null) return;
    updateMutation.mutate(
      { id: selectedItemId, projectId, status: "declined", declineReason: data.reason },
      {
        onSuccess: () => {
          setDeclineOpen(false);
          declineForm.reset();
          toast.success("Item declined");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [selectedItemId, updateMutation, projectId, declineForm]);

  const handleAccept = useCallback((itemId: number) => {
    setSelectedItemId(itemId);
    acceptForm.reset();
    setAcceptOpen(true);
  }, [acceptForm]);

  const handleDecline = useCallback((itemId: number) => {
    setSelectedItemId(itemId);
    declineForm.reset();
    setDeclineOpen(true);
  }, [declineForm]);

  const handleDuplicate = useCallback((itemId: number) => {
    updateMutation.mutate(
      { id: itemId, projectId, status: "duplicate" },
      {
        onSuccess: () => toast.success("Item marked as duplicate"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [updateMutation, projectId]);

  const handleCopyFormUrl = useCallback(() => {
    const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/intake/${projectId}`;
    navigator.clipboard.writeText(formUrl);
    toast.success("Form URL copied to clipboard");
  }, [projectId]);

  function handleOpenCreate(): void { setCreateOpen(true); }
  function handleCloseCreate(): void { setCreateOpen(false); }
  function handleCloseAccept(): void { setAcceptOpen(false); }
  function handleCloseDecline(): void { setDeclineOpen(false); }

  const allItems = intakeData?.data ?? [];
  const filteredItems = allItems.filter((item) => activeTab === "all" || item.status === activeTab);
  const pendingCount = allItems.filter((i) => i.status === "pending").length;

  if (isLoading) {
    return (
      <PageWrapper title="Intake" subtitle="Collect and triage incoming requests from your team or clients">
        <PmPageShell>
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Intake"
      subtitle="Collect and triage incoming requests from your team or clients"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyFormUrl}>
            <ExternalLink className="h-4 w-4 mr-1" /> Copy Form URL
          </Button>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Item
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
              <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
                <SheetTitle>Create Intake Item</SheetTitle>
              </SheetHeader>
              <SheetBody className="px-6 py-5">
                <form id="create-intake-form" onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="intake-title">Title</Label>
                    <Input id="intake-title" {...createForm.register("title")} />
                    {createForm.formState.errors.title && (
                      <p className="text-xs text-destructive mt-1">{createForm.formState.errors.title.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="intake-desc">Description</Label>
                    <Textarea id="intake-desc" {...createForm.register("description")} />
                  </div>
                </form>
              </SheetBody>
              <div className="shrink-0 px-6 py-4 border-t">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={handleCloseCreate}>Cancel</Button>
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
        </div>
      }
    >
      <PmPageShell>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <PmSection index={0}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending
                {pendingCount > 0 ? (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
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
                title={activeTab === "pending" ? "No pending items" : `No ${activeTab} items`}
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
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </PmStaggerList>
              </PmSection>
            )}
          </TabsContent>
        </Tabs>

      <Sheet open={acceptOpen} onOpenChange={setAcceptOpen}>
        <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Accept Intake Item</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            <form id="accept-intake-form" onSubmit={acceptForm.handleSubmit(onAcceptSubmit)} className="space-y-4">
              <div>
                <Label>State</Label>
                <Controller
                  control={acceptForm.control}
                  name="state"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select state..." /></SelectTrigger>
                      <SelectContent>
                        {WORK_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {acceptForm.formState.errors.state && (
                  <p className="text-xs text-destructive mt-1">{acceptForm.formState.errors.state.message}</p>
                )}
              </div>
              <div>
                <Label>Assignee</Label>
                <Select
                  value={assigneeIdField.value ?? ""}
                  onValueChange={handleAssigneeChange}
                >
                  <SelectTrigger><SelectValue placeholder="Select assignee..." /></SelectTrigger>
                  <SelectContent>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {getUserDisplayName(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cycle</Label>
                <Select
                  value={cycleIdField.value?.toString() ?? ""}
                  onValueChange={handleCycleChange}
                >
                  <SelectTrigger><SelectValue placeholder="Select cycle..." /></SelectTrigger>
                  <SelectContent>
                    {cycles?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Module</Label>
                <Select
                  value={moduleIdField.value?.toString() ?? ""}
                  onValueChange={handleModuleChange}
                >
                  <SelectTrigger><SelectValue placeholder="Select module..." /></SelectTrigger>
                  <SelectContent>
                    {modules?.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </form>
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleCloseAccept}>Cancel</Button>
              <Button size="sm" type="submit" form="accept-intake-form" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Accepting…" : "Accept & Create"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={declineOpen} onOpenChange={setDeclineOpen}>
        <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Decline Intake Item</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            <form id="decline-intake-form" onSubmit={declineForm.handleSubmit(onDeclineSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="decline-reason">Reason</Label>
                <Textarea
                  id="decline-reason"
                  placeholder="Why is this being declined?"
                  {...declineForm.register("reason")}
                />
                {declineForm.formState.errors.reason && (
                  <p className="text-xs text-destructive mt-1">{declineForm.formState.errors.reason.message}</p>
                )}
              </div>
            </form>
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleCloseDecline}>Cancel</Button>
              <Button size="sm" variant="destructive" type="submit" form="decline-intake-form" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Declining…" : "Decline Item"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      </PmPageShell>
    </PageWrapper>
  );
}
