"use client";

import { use, useState } from "react";
import { trpc } from "@/trpc/client";
import { ProjectSubNav } from "@/components/projects/project-sub-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyInboxIllustration } from "@/components/illustrations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Inbox,
  Check,
  X,
  Copy,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const createIntakeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});
type CreateIntakeForm = z.infer<typeof createIntakeSchema>;

const acceptSchema = z.object({
  state: z.string().min(1, "State is required"),
  assigneeId: z.number().optional(),
  cycleId: z.number().optional(),
  moduleId: z.number().optional(),
});
type AcceptForm = z.infer<typeof acceptSchema>;

const declineSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});
type DeclineForm = z.infer<typeof declineSchema>;

const WORK_STATES = ["backlog", "todo", "in_progress", "done", "cancelled"] as const;

const statusBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  declined: "destructive",
  duplicate: "outline",
};

export default function IntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const [createOpen, setCreateOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const utils = trpc.useUtils();
  const { data: intakeItems, isLoading } = trpc.project.intakeGetByProject.useQuery(
    { projectId }
  );
  const { data: members } = trpc.project.getProjectMembers.useQuery();
  const { data: cycles } = trpc.project.cyclesGetByProject.useQuery({ projectId });
  const { data: modules } = trpc.project.modulesGetByProject.useQuery({ projectId });

  const createMutation = trpc.project.intakeCreate.useMutation({
    onSuccess: () => {
      utils.project.intakeGetByProject.invalidate({ projectId });
      setCreateOpen(false);
      createForm.reset();
      toast.success("Intake item created");
    },
    onError: (err) => toast.error(err.message),
  });

  const acceptMutation = trpc.project.intakeAccept.useMutation({
    onSuccess: () => {
      utils.project.intakeGetByProject.invalidate({ projectId });
      setAcceptOpen(false);
      acceptForm.reset();
      toast.success("Item accepted and work item created");
    },
    onError: (err) => toast.error(err.message),
  });

  const declineMutation = trpc.project.intakeDecline.useMutation({
    onSuccess: () => {
      utils.project.intakeGetByProject.invalidate({ projectId });
      setDeclineOpen(false);
      declineForm.reset();
      toast.success("Item declined");
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateMutation = trpc.project.intakeMarkDuplicate.useMutation({
    onSuccess: () => {
      utils.project.intakeGetByProject.invalidate({ projectId });
      toast.success("Item marked as duplicate");
    },
    onError: (err) => toast.error(err.message),
  });

  const createForm = useForm<CreateIntakeForm>({
    resolver: zodResolver(createIntakeSchema),
  });

  const acceptForm = useForm<AcceptForm>({
    resolver: zodResolver(acceptSchema),
  });

  const declineForm = useForm<DeclineForm>({
    resolver: zodResolver(declineSchema),
  });

  const onCreateSubmit = (data: CreateIntakeForm) => {
    createMutation.mutate({ ...data, projectId });
  };

  const onAcceptSubmit = (data: AcceptForm) => {
    if (selectedItemId === null) return;
    acceptMutation.mutate({ id: selectedItemId, stateId: parseInt(data.state), assigneeId: data.assigneeId?.toString(), cycleId: data.cycleId, moduleId: data.moduleId });
  };

  const onDeclineSubmit = (data: DeclineForm) => {
    if (selectedItemId === null) return;
    declineMutation.mutate({ id: selectedItemId, reason: data.reason });
  };

  const handleAccept = (itemId: number) => {
    setSelectedItemId(itemId);
    acceptForm.reset();
    setAcceptOpen(true);
  };

  const handleDecline = (itemId: number) => {
    setSelectedItemId(itemId);
    declineForm.reset();
    setDeclineOpen(true);
  };

  const handleDuplicate = (itemId: number) => {
    duplicateMutation.mutate({ id: itemId, linkedWorkItemId: 0 });
  };

  const allItems = intakeItems && "items" in intakeItems ? intakeItems.items : [];
  const filteredItems = allItems.filter((item) => {
    if (activeTab === "all") return true;
    return item.status === activeTab;
  });

  const formUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/intake/${projectId}`;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
        <ProjectSubNav projectId={projectId} />
        <div className="flex items-center justify-between mt-4">
          <h1 className="text-2xl font-bold">Intake</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(formUrl);
                toast.success("Form URL copied to clipboard");
              }}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Copy Form URL
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> New Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Intake Item</DialogTitle>
                </DialogHeader>
                <form
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
                      <p className="text-xs text-destructive mt-1">
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
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Item"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span className="truncate">Public form: {formUrl}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(formUrl);
              toast.success("Copied");
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {allItems.filter((i) => i.status === "pending")
                .length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {
                    allItems.filter((i) => i.status === "pending")
                      .length
                  }
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <EmptyInboxIllustration className="mx-auto mb-4 w-36 h-36" />
                <h3 className="text-lg font-semibold mb-1">
                  {activeTab === "pending"
                    ? "No pending items"
                    : `No ${activeTab} items`}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === "pending"
                    ? "Share the form URL to start receiving submissions."
                    : "Items will appear here once triaged."}
                </p>
                {activeTab === "pending" && (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Create First Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">
                              {item.title}
                            </p>
                            <Badge
                              variant={
                                statusBadgeVariant[item.status] ?? "outline"
                              }
                            >
                              {item.status.charAt(0).toUpperCase() +
                                item.status.slice(1)}
                            </Badge>
                          </div>
                          {item.description != null ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {typeof item.description === "string" ? item.description : JSON.stringify(item.description)}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                            {item.submitterEmail && ` by ${item.submitterEmail}`}
                          </p>
                          {item.declineReason && (
                            <p className="text-xs text-destructive mt-1">
                              Reason: {item.declineReason}
                            </p>
                          )}
                        </div>
                        {item.status === "pending" && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAccept(item.id)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDecline(item.id)}
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Decline
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDuplicate(item.id)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Intake Item</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={acceptForm.handleSubmit(onAcceptSubmit)}
            className="space-y-4"
          >
            <div>
              <Label>State</Label>
              <Controller
                control={acceptForm.control}
                name="state"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state..." />
                    </SelectTrigger>
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
                <p className="text-xs text-destructive mt-1">
                  {acceptForm.formState.errors.state.message}
                </p>
              )}
            </div>
            <div>
              <Label>Assignee</Label>
              <Controller
                control={acceptForm.control}
                name="assigneeId"
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? ""}
                    onValueChange={(v) =>
                      field.onChange(v ? parseInt(v) : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name ?? m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Cycle</Label>
              <Controller
                control={acceptForm.control}
                name="cycleId"
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? ""}
                    onValueChange={(v) =>
                      field.onChange(v ? parseInt(v) : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cycle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cycles?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Module</Label>
              <Controller
                control={acceptForm.control}
                name="moduleId"
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? ""}
                    onValueChange={(v) =>
                      field.onChange(v ? parseInt(v) : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select module..." />
                    </SelectTrigger>
                    <SelectContent>
                      {modules?.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button
              type="submit"
              disabled={acceptMutation.isPending}
              className="w-full"
            >
              {acceptMutation.isPending ? "Accepting..." : "Accept & Create Work Item"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Intake Item</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={declineForm.handleSubmit(onDeclineSubmit)}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="decline-reason">Reason</Label>
              <Textarea
                id="decline-reason"
                placeholder="Why is this being declined?"
                {...declineForm.register("reason")}
              />
              {declineForm.formState.errors.reason && (
                <p className="text-xs text-destructive mt-1">
                  {declineForm.formState.errors.reason.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={declineMutation.isPending}
              className="w-full"
            >
              {declineMutation.isPending ? "Declining..." : "Decline Item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
