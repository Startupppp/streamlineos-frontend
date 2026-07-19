"use client";

import type { ReactNode } from "react";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExternalLink } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PageWrapper } from "@/components/ui/page-wrapper";
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
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireModule } from "@/components/auth/require-module";
import {
  useGitConnections,
  useCreateGitConnection,
  useUpdateGitConnection,
  useDeleteGitConnection,
  type GitConnection,
  type GitProvider,
  type CreatedGitConnection,
} from "@/hooks/api/git-integration";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { ProviderIcon, ConnectionRow } from "./git-connection-row";
import { CreatedSecretDialog } from "./git-created-secret-dialog";
import { SetupInstructions } from "./git-setup-instructions";

const gitConnectionSchema = z.object({
  provider: z.string(),
  repoUrl: z.string().min(1, "Repository URL is required"),
  repoName: z.string(),
});

type GitConnectionFormValues = z.infer<typeof gitConnectionSchema>;

const PROVIDERS: { value: GitProvider; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
  { value: "bitbucket", label: "Bitbucket" },
];

function AddConnectionButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" />
      Add connection
    </Button>
  );
}

export function ProjectsGitIntegrationSettings({ footer }: { footer?: ReactNode }) {
  const {
    data: connections,
    isLoading,
    isError,
    refetch,
  } = useGitConnections();
  const createConnection = useCreateGitConnection();
  const updateConnection = useUpdateGitConnection();
  const deleteConnection = useDeleteGitConnection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [created, setCreated] = useState<CreatedGitConnection | null>(null);

  const gitForm = useForm<GitConnectionFormValues>({
    resolver: zodResolver(gitConnectionSchema),
    defaultValues: { provider: "github", repoUrl: "", repoName: "" },
  });

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) gitForm.reset();
    },
    [gitForm],
  );

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);

  const handleCreate = useCallback((values: GitConnectionFormValues) => {
    createConnection.mutate(
      { provider: values.provider as GitProvider, repoUrl: values.repoUrl.trim(), repoName: values.repoName.trim() || undefined },
      {
        onSuccess: (data) => {
          toast.success("Connection created");
          setDialogOpen(false);
          gitForm.reset();
          setCreated(data);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [createConnection, gitForm]);

  const handleToggle = useCallback(
    (connection: GitConnection) => {
      updateConnection.mutate(
        { id: connection.id, isActive: !connection.isActive },
        {
          onSuccess: () =>
            toast.success(
              connection.isActive
                ? "Connection paused"
                : "Connection activated",
            ),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateConnection],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteConnection.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Connection deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteConnection]);

  const handleCancelDialog = useCallback(() => handleDialogChange(false), [handleDialogChange]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleCloseCreated = useCallback(() => setCreated(null), []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <RequireModule module="PROJECTS">
      <PageWrapper
        title="Integrations"
        subtitle="Connect Git repositories to link commits and pull requests to tickets"
        actions={<AddConnectionButton onClick={handleOpenDialog} />}
      >
        <PmPageShell className="flex-none overflow-visible">
          <PmSection index={0}>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={cn(PM_PANEL, "space-y-3 p-4")}>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <ErrorState
                  className={PM_FILL_PANEL}
                  title="Could not load connections"
                  description="There was a problem loading your Git connections."
                  onRetry={handleRetry}
                />
            ) : !connections || connections.length === 0 ? (
              <div className="flex min-h-full flex-col gap-4">
                <EmptyState
                    className={PM_FILL_PANEL}
                    illustration={<EmptyDevicesIllustration />}
                    title="No repositories connected"
                    description="Connect GitHub, GitLab, or Bitbucket to link commits and PRs to your tickets."
                    action={{ label: "Add connection", onClick: handleOpenDialog }}
                  />
                <div className="shrink-0">
                  <SetupInstructions />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <PmStaggerList className="space-y-3">
                  {connections.map((connection) => (
                    <ConnectionRow
                      key={connection.id}
                      connection={connection}
                      onToggle={handleToggle}
                      onDelete={setDeleteId}
                      isToggling={updateConnection.isPending}
                    />
                  ))}
                </PmStaggerList>
                <SetupInstructions />
              </div>
            )}
          </PmSection>

          {footer ? (
            <PmSection index={1}>
              <div className="mt-2">{footer}</div>
            </PmSection>
          ) : null}
        </PmPageShell>

        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Git connection</DialogTitle>
              <DialogDescription>
                We generate a webhook URL and secret for you to paste into your repository.
              </DialogDescription>
            </DialogHeader>
            <Form {...gitForm}>
              <form onSubmit={gitForm.handleSubmit(handleCreate)} className="space-y-4">
                <FormField
                  control={gitForm.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROVIDERS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              <span className="flex items-center gap-2">
                                <ProviderIcon provider={p.value} className="h-4 w-4" />
                                {p.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={gitForm.control}
                  name="repoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repository URL <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input {...field} className="pl-9" placeholder="https://github.com/org/repo" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={gitForm.control}
                  name="repoName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display name (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="org/repo" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <DialogFooter>
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

        {created ? (
          <CreatedSecretDialog created={created} onClose={handleCloseCreated} />
        ) : null}

        <AlertDialog open={deleteId !== null} onOpenChange={handleDeleteDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete connection?</AlertDialogTitle>
              <AlertDialogDescription>
                The webhook will stop linking commits and pull requests. Existing links are kept.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleConfirmDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageWrapper>
    </RequireModule>
  );
}
