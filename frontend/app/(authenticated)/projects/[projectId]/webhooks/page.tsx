"use client";

import { use, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Zap, Clock, ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useWebhookDeliveries,
  useSendTestWebhook,
  type ProjectWebhook,
  type WebhookDelivery,
} from "@/hooks/api/projects/webhooks";
import { cn } from "@/lib/utils";

const WEBHOOK_EVENTS = [
  { value: "ticket.created", label: "Ticket Created" },
  { value: "ticket.updated", label: "Ticket Updated" },
  { value: "ticket.deleted", label: "Ticket Deleted" },
  { value: "ticket.assigned", label: "Ticket Assigned" },
  { value: "sprint.started", label: "Sprint Started" },
  { value: "sprint.completed", label: "Sprint Completed" },
  { value: "comment.created", label: "Comment Added" },
  { value: "member.added", label: "Member Added" },
  { value: "member.removed", label: "Member Removed" },
];

const schema = z.object({
  url: z.string().url("Must be a valid URL starting with https://"),
  events: z.array(z.string()).min(1, "Select at least one event"),
  secret: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  const statusColor =
    delivery.status === "success"
      ? "bg-emerald-500"
      : delivery.status === "failed"
        ? "bg-red-500"
        : "bg-amber-400";
  return (
    <div className="py-2 px-3 border-b last:border-0">
      <div className="flex items-center gap-3 text-sm">
        <div className={cn("h-2 w-2 rounded-full shrink-0", statusColor)} />
        <span className="flex-1 font-mono text-xs text-muted-foreground truncate">
          {delivery.event}
        </span>
        <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
          {delivery.responseCode ?? "—"}
        </Badge>
        {delivery.attempts > 1 && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {delivery.attempts}x
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground shrink-0">
          {new Date(delivery.deliveredAt).toLocaleTimeString()}
        </span>
      </div>
      {delivery.lastError && delivery.status === "failed" && (
        <p className="mt-0.5 ml-5 text-[10px] text-red-500 truncate">{delivery.lastError}</p>
      )}
    </div>
  );
}

function WebhookCard({
  webhook,
  projectId,
  onDelete,
}: {
  webhook: ProjectWebhook;
  projectId: number;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: deliveries = [], isLoading } = useWebhookDeliveries(
    projectId,
    webhook.id,
    expanded,
  );
  const sendTest = useSendTestWebhook(projectId);

  function handleToggle() {
    setExpanded((v) => !v);
  }

  const handleConfirmDelete = useCallback(() => onDelete(webhook.id), [onDelete, webhook.id]);

  const handleSendTest = useCallback(() => {
    sendTest.mutate(webhook.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success("Test delivery succeeded");
        } else {
          toast.error(`Test delivery failed (HTTP ${result.responseCode ?? "—"})`);
        }
        setExpanded(true);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [sendTest, webhook.id]);

  return (
    <motion.div
      layout
      className="border border-border rounded-lg overflow-hidden bg-card shadow-sm"
    >
      <div className="flex items-center gap-3 p-3.5">
        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">{webhook.url}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {webhook.events.slice(0, 3).map((e) => (
              <Badge
                key={e}
                variant="secondary"
                className="text-[10px] py-0 px-1.5 bg-muted text-muted-foreground border-border font-mono"
              >
                {e}
              </Badge>
            ))}
            {webhook.events.length > 3 && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                +{webhook.events.length - 3} more
              </Badge>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSendTest}
          disabled={sendTest.isPending}
          aria-label="Send test webhook"
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={expanded ? "Hide deliveries" : "Show deliveries"}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label="Delete webhook"
              className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
              <AlertDialogDescription>
                Deliveries will stop immediately. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-3.5">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Recent Deliveries
              </p>
              {isLoading ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : deliveries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No deliveries yet
                </p>
              ) : (
                <div className="rounded-md border border-border overflow-hidden bg-muted/20">
                  {deliveries.slice(0, 5).map((d) => (
                    <DeliveryRow key={d.id} delivery={d} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function WebhooksPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: webhooks = [], isLoading, isError, refetch } = useWebhooks(projectId);
  const createWebhook = useCreateWebhook(projectId);
  const deleteWebhook = useDeleteWebhook(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", events: [], secret: "" },
  });

  const handleSubmit = useCallback(
    (values: FormValues) => {
      createWebhook.mutate(
        { url: values.url, events: values.events, secret: values.secret || undefined },
        {
          onSuccess: () => {
            form.reset();
            setSheetOpen(false);
            toast.success("Webhook created");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [createWebhook, form],
  );

  const handleDelete = useCallback(
    (webhookId: number) => {
      deleteWebhook.mutate(webhookId, {
        onSuccess: () => toast.success("Webhook deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteWebhook],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleCancelForm = useCallback(() => {
    setSheetOpen(false);
    form.reset();
  }, [form]);

  const handleShowForm = useCallback(() => setSheetOpen(true), []);

  return (
    <PageWrapper
      eyebrow="Project"
      title="Webhooks"
      subtitle="Receive HTTP POST notifications when project events occur"
      actions={
        <Button size="sm" onClick={handleShowForm}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Webhook
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-3 pb-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Could not load webhooks"
            description="Failed to load webhooks."
            onRetry={handleRetry}
            className="flex-1 min-h-[40vh]"
          />
        ) : (
          <>
            <AnimatePresence initial={false}>
              {webhooks.map((wh, idx) => (
                <motion.div
                  key={wh.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <WebhookCard webhook={wh} projectId={projectId} onDelete={handleDelete} />
                </motion.div>
              ))}
            </AnimatePresence>

            {webhooks.length === 0 && (
              <EmptyState
                illustrationPreset="automations"
                title="No webhooks configured"
                description="Get notified in real-time when tickets, sprints, or members change."
                action={{ label: "Create Webhook", onClick: handleShowForm }}
                className="min-h-[40vh]"
              />
            )}
          </>
        )}

      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md overflow-hidden">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Webhook</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Form {...form}>
              <form id="webhook-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Payload URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/webhook"
                          className="h-8 text-sm font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="events"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Events to subscribe
                      </FormLabel>
                      <div className="grid grid-cols-2 gap-1.5">
                        {WEBHOOK_EVENTS.map((ev) => (
                          <label
                            key={ev.value}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all duration-150 select-none",
                              field.value.includes(ev.value)
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border hover:border-border/80 bg-card",
                            )}
                          >
                            <Checkbox
                              checked={field.value.includes(ev.value)}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...field.value, ev.value]
                                  : field.value.filter((v) => v !== ev.value);
                                field.onChange(next);
                              }}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-xs font-medium">{ev.label}</span>
                          </label>
                        ))}
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Signing Secret{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Used to sign payloads"
                          type="password"
                          className="h-8 text-sm font-mono"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelForm}>Cancel</Button>
              <Button size="sm" type="submit" form="webhook-form" disabled={createWebhook.isPending}>
                {createWebhook.isPending ? "Creating…" : "Create Webhook"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
