"use client";

import { use, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Zap, Clock, ChevronDown } from "lucide-react";
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
    <div className="flex items-center gap-3 py-2 px-3 text-sm border-b last:border-0">
      <div className={cn("h-2 w-2 rounded-full shrink-0", statusColor)} />
      <span className="flex-1 font-mono text-xs text-muted-foreground truncate">
        {delivery.event}
      </span>
      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
        {delivery.responseCode ?? "—"}
      </Badge>
      <span className="text-[10px] text-muted-foreground shrink-0">
        {new Date(delivery.deliveredAt).toLocaleTimeString()}
      </span>
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

  function handleToggle() {
    setExpanded((v) => !v);
  }

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
          <p className="text-sm font-medium truncate text-slate-800">{webhook.url}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {webhook.events.slice(0, 3).map((e) => (
              <Badge
                key={e}
                variant="secondary"
                className="text-[10px] py-0 px-1.5 bg-slate-100 text-slate-700 border-slate-200 font-mono"
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
          onClick={handleToggle}
          aria-label={expanded ? "Hide deliveries" : "Show deliveries"}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
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
              className="h-7 w-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
                onClick={() => onDelete(webhook.id)}
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
  const [showForm, setShowForm] = useState(false);

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
            setShowForm(false);
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

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    form.reset();
  }, [form]);

  const handleShowForm = useCallback(() => setShowForm(true), []);

  return (
    <PageWrapper
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
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">Failed to load webhooks.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
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

            {webhooks.length === 0 && !showForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 gap-3"
              >
                <div className="h-14 w-14 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <Zap className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No webhooks configured</p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Get notified in real-time when tickets, sprints, or members change.
                </p>
                <Button
                  onClick={handleShowForm}
                  className="mt-2 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Webhook
                </Button>
              </motion.div>
            )}

            {webhooks.length > 0 && !showForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowForm}
                className="gap-1.5 h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Webhook
              </Button>
            )}
          </>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border border-border rounded-lg bg-muted/30 p-5"
            >
              <h3 className="text-sm font-semibold text-slate-800 mb-4">New Webhook</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-600">Payload URL</FormLabel>
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
                        <FormLabel className="text-xs text-slate-600">
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
                        <FormLabel className="text-xs text-slate-600">
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

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createWebhook.isPending}
                      className="h-8 text-xs gap-1.5"
                    >
                      {createWebhook.isPending ? "Creating..." : "Create Webhook"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelForm}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
