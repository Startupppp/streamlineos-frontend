"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, AlertCircle, Hash } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Trash2Icon, CopyIcon } from "@animateicons/react/lucide";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { useCan } from "@/hooks/api/access";
import {
  useSlackConnections,
  useCreateSlackConnection,
  useDeleteSlackConnection,
  type SlackConnection,
} from "@/hooks/api/slack-integration";
import {
  slackConnectionSchema,
  type SlackConnectionFormValues,
} from "./slack-connection-schema";

function SlackConnectionRow({
  connection,
  onDelete,
}: {
  connection: SlackConnection;
  onDelete: (id: number) => void;
}) {
  const handleDelete = useCallback(() => onDelete(connection.id), [connection.id, onDelete]);
  const handleCopyWebhook = useCallback(() => {
    void navigator.clipboard.writeText(connection.webhookUrl);
    toast.success("Webhook URL copied");
  }, [connection.webhookUrl]);

  const hasRecentError =
    connection.lastErrorAt !== null &&
    (connection.lastEventAt === null ||
      new Date(connection.lastErrorAt) > new Date(connection.lastEventAt));

  return (
    <div className={cn(PM_PANEL, "overflow-hidden")}>
      <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-border/50">
            <Hash className="h-4 w-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <TruncatedText
              text={connection.teamName ?? connection.teamId}
              className="text-sm font-medium"
            />
            <p className="mt-0.5 text-xs text-muted-foreground">
              Team ID: {connection.teamId}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasRecentError ? (
            <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-label="Last event failed" />
          ) : connection.lastEventAt !== null ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-label="Receiving events" />
          ) : null}
          <Badge
            variant={connection.isActive ? "default" : "secondary"}
            className="text-micro"
          >
            {connection.isActive ? "Active" : "Paused"}
          </Badge>
          <AnimatedIconButton
            variant="ghost"
            size="icon"
            className="w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete Slack connection"
            icon={Trash2Icon}
            iconSize={16}
          />
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Webhook URL</Label>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
            <code className={cn(TEXT_ONE_LINE, "flex-1 font-mono text-xs")}>
              {connection.webhookUrl}
            </code>
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              className="w-7 shrink-0"
              onClick={handleCopyWebhook}
              aria-label="Copy webhook URL"
              icon={CopyIcon}
              iconSize={14}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  postmark: "Postmark",
  mailgun: "Mailgun",
  sendgrid: "SendGrid",
};

export function SlackIntegrationSettings() {
  const canManage = useCan("integrations:slack:manage");
  const { data, isLoading, isError, refetch } = useSlackConnections();
  const createConnection = useCreateSlackConnection();
  const deleteConnection = useDeleteSlackConnection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<SlackConnectionFormValues>({
    resolver: zodResolver(slackConnectionSchema),
    defaultValues: {
      teamId: "",
      teamName: "",
      signingSecret: "",
      botToken: "",
      defaultChannelId: "",
    },
  });

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) form.reset();
    },
    [form],
  );

  const handleCreate = useCallback(
    (values: SlackConnectionFormValues) => {
      createConnection.mutate(
        {
          teamId: values.teamId.trim(),
          teamName: values.teamName?.trim() || undefined,
          signingSecret: values.signingSecret.trim(),
          botToken: values.botToken.trim(),
          defaultChannelId: values.defaultChannelId?.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Slack connection created");
            setDialogOpen(false);
            form.reset();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [createConnection, form],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteConnection.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Slack connection deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteConnection]);

  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleCancelDialog = useCallback(() => handleDialogChange(false), [handleDialogChange]);
  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const connections = data?.data ?? [];

  return (
    <>
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-medium">Slack</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Receive ticket notifications and link Slack mentions to tickets.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" variant="outline" type="button" onClick={() => setDialogOpen(true)}>
            Add connection
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Could not load Slack connections"
          description="There was a problem loading your Slack connections."
          onRetry={handleRetry}
        />
      ) : connections.length === 0 ? (
        <EmptyState
          title="No Slack workspace connected"
          description="Connect a Slack workspace to receive ticket notifications."
          action={canManage ? { label: "Add connection", onClick: () => setDialogOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <SlackConnectionRow
              key={connection.id}
              connection={connection}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>Add Slack connection</DialogTitle>
            <DialogDescription>
              Enter your Slack app credentials. You can find these in your Slack app configuration.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCreate)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <DialogBody className="space-y-4 px-6 py-2">
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace / Team ID <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="TXXXXXXXX" className="font-mono" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace name (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Acme Corp" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signingSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signing secret <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Slack signing secret" className="font-mono" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="botToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot token <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="xoxb-..." className="font-mono" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultChannelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default channel ID (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CXXXXXXXX" className="font-mono" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </DialogBody>
              <DialogFooter className="shrink-0 border-t border-border/60 px-6 py-4">
                <Button type="button" variant="outline" onClick={handleCancelDialog}>
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={createConnection.isPending} loadingText="Creating…">
                  Create connection
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete Slack connection?"
        description="Ticket notifications to this workspace will stop. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

export { PROVIDER_LABELS };
