"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useEmailInboundConnections,
  useCreateEmailInboundConnection,
  useDeleteEmailInboundConnection,
  type EmailInboundProvider,
} from "@/hooks/api/email-inbound-integration";
import {
  emailInboundConnectionSchema,
  type EmailInboundConnectionFormValues,
} from "./email-inbound-connection-schema";
import { EmailInboundConnectionRow } from "./email-inbound-connection-row";

const PROVIDER_OPTIONS: { value: EmailInboundProvider; label: string }[] = [
  { value: "postmark", label: "Postmark" },
  { value: "mailgun", label: "Mailgun" },
  { value: "sendgrid", label: "SendGrid" },
];

export function EmailInboundSettings() {
  const canManage = useCan("integrations:email-inbound:manage");
  const { data, isLoading, isError, refetch } = useEmailInboundConnections();
  const createConnection = useCreateEmailInboundConnection();
  const deleteConnection = useDeleteEmailInboundConnection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<EmailInboundConnectionFormValues>({
    resolver: zodResolver(emailInboundConnectionSchema),
    defaultValues: {
      provider: "postmark",
      inboundAddress: "",
      signingSecret: "",
    },
  });

  useRegisterDirtyState(dialogOpen && form.formState.isDirty);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) form.reset();
    },
    [form],
  );

  const handleCreate = useCallback(
    (values: EmailInboundConnectionFormValues) => {
      createConnection.mutate(
        {
          provider: values.provider,
          inboundAddress: values.inboundAddress.trim(),
          signingSecret: values.signingSecret.trim(),
        },
        {
          onSuccess: () => {
            toast.success("Email inbound connection created");
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
        toast.success("Email inbound connection deleted");
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
          <h3 className="text-sm font-medium">Inbound Email</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Convert inbound emails into intake items automatically.
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
          title="Could not load email connections"
          description="There was a problem loading your inbound email connections."
          onRetry={handleRetry}
        />
      ) : connections.length === 0 ? (
        <EmptyState
          title="No inbound email configured"
          description="Connect Postmark, Mailgun, or SendGrid to route inbound emails to intake."
          action={canManage ? { label: "Add connection", onClick: () => setDialogOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <EmailInboundConnectionRow
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
            <DialogTitle>Add inbound email connection</DialogTitle>
            <DialogDescription>
              Configure your email provider to forward inbound messages as intake items.
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
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROVIDER_OPTIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inboundAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inbound email address <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="intake@yourdomain.com" />
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
                      <FormLabel>Signing secret / webhook token <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Provider webhook secret" className="font-mono" />
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
        title="Delete email connection?"
        description="Inbound emails to this address will no longer create intake items. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
