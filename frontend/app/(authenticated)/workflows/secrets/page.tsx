"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useGlobalSecrets,
  useCreateGlobalSecret,
  useDeleteGlobalSecret,
  type WorkflowSecret,
} from "@/hooks/api/workflows";

const createSecretSchema = z.object({
  name: z.string().min(1, "Name is required").regex(/^[A-Z0-9_]+$/, "Use uppercase letters, digits, underscores only"),
  value: z.string().min(1, "Secret value is required"),
  description: z.string().optional(),
});

type CreateSecretValues = z.infer<typeof createSecretSchema>;

interface SecretCardProps {
  secret: WorkflowSecret;
  index: number;
  onDelete: (s: WorkflowSecret) => void;
}

function SecretCard({ secret, index, onDelete }: SecretCardProps) {
  function handleDelete() {
    onDelete(secret);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.04 }}
    >
      <Card className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
              <KeyRound className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-semibold font-mono text-foreground">{secret.name}</code>
                <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">encrypted</Badge>
              </div>
              {secret.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{secret.description}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Added {format(new Date(secret.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
              onClick={handleDelete}
              aria-label="Delete secret"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface CreateSecretSheetProps {
  open: boolean;
  onClose: () => void;
}

function CreateSecretSheet({ open, onClose }: CreateSecretSheetProps) {
  const createSecret = useCreateGlobalSecret();

  const form = useForm<CreateSecretValues>({
    resolver: zodResolver(createSecretSchema),
    defaultValues: { name: "", value: "", description: "" },
  });

  function handleSubmit(values: CreateSecretValues) {
    createSecret.mutate(
      { name: values.name, value: values.value, description: values.description || undefined },
      {
        onSuccess: () => {
          toast.success("Secret created");
          form.reset();
          onClose();
        },
        onError: () => toast.error("Failed to create secret"),
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      onClose();
    }
  }

  const handleFormSubmit = form.handleSubmit(handleSubmit);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <SheetTitle>New Secret</SheetTitle>
          <SheetDescription>
            Secrets are encrypted at rest and never returned in plain text.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. STRIPE_API_KEY"
                        className="font-mono uppercase"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Value</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter secret value"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What is this secret used for?"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter className="px-6 py-4 border-t border-border/60 gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={createSecret.isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSecret.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200"
              >
                {createSecret.isPending ? "Saving…" : "Save Secret"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default function SecretsManagerPage() {
  const { data: secrets, isLoading, isError, refetch } = useGlobalSecrets();
  const deleteSecret = useDeleteGlobalSecret();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSecret | null>(null);

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  function handleCloseSheet() {
    setSheetOpen(false);
  }

  function handleDeleteTarget(secret: WorkflowSecret) {
    setDeleteTarget(secret);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteSecret.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Secret deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete secret"),
    });
  }

  function handleRetry() {
    void refetch();
  }

  const list = secrets ?? [];

  return (
    <PageWrapper
      title="Secrets Manager"
      subtitle="Manage encrypted secrets used by your workflows"
      actions={
        <Button
          size="sm"
          onClick={handleOpenSheet}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-1" /> New Secret
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState variant="list" rows={5} />
      ) : isError ? (
        <ErrorState title="Failed to load secrets" onRetry={handleRetry} className="flex-1" />
      ) : list.length === 0 ? (
        <div className="flex flex-1 min-h-0">
          <EmptyState
            illustrationPreset="security"
            title="No secrets yet"
            description="Store encrypted API keys, tokens, and credentials your workflows need."
            action={{ label: "New Secret", onClick: handleOpenSheet }}
            className="w-full"
          />
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {list.map((secret, idx) => (
              <SecretCard
                key={secret.id}
                secret={secret}
                index={idx}
                onDelete={handleDeleteTarget}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <CreateSecretSheet open={sheetOpen} onClose={handleCloseSheet} />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete secret?</AlertDialogTitle>
            <AlertDialogDescription>
              <code className="text-xs font-mono">{deleteTarget?.name}</code> will be permanently
              deleted. Any workflow using this secret will fail until updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
