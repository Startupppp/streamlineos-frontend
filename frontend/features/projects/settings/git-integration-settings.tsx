"use client";

import type { ReactNode } from "react";
import { useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [provider, setProvider] = useState<GitProvider>("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoName, setRepoName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [created, setCreated] = useState<CreatedGitConnection | null>(null);

  const resetForm = useCallback(() => {
    setProvider("github");
    setRepoUrl("");
    setRepoName("");
  }, []);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) resetForm();
    },
    [resetForm],
  );

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);

  const handleProviderChange = useCallback((value: string) => {
    const matched = PROVIDERS.find((p) => p.value === value);
    if (matched) setProvider(matched.value);
  }, []);

  const handleRepoUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRepoUrl(e.target.value);
    },
    [],
  );

  const handleRepoNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRepoName(e.target.value);
    },
    [],
  );

  const handleCreate = useCallback(() => {
    const trimmedUrl = repoUrl.trim();
    if (!trimmedUrl) {
      toast.error("Repository URL is required");
      return;
    }
    createConnection.mutate(
      { provider, repoUrl: trimmedUrl, repoName: repoName.trim() || undefined },
      {
        onSuccess: (data) => {
          toast.success("Connection created");
          setDialogOpen(false);
          resetForm();
          setCreated(data);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [provider, repoUrl, repoName, createConnection, resetForm]);

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

  function handleCancelDialog() {
    handleDialogChange(false);
  }

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
        eyebrow="Projects"
        subtitle="Connect Git repositories to link commits and pull requests to tickets"
        actions={<AddConnectionButton onClick={handleOpenDialog} />}
      >
        <PmPageShell>
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
              <PmPanel className={cn(PM_FILL_PANEL, "items-center justify-center p-6")}>
                <ErrorState
                  title="Could not load connections"
                  description="There was a problem loading your Git connections."
                  onRetry={handleRetry}
                />
              </PmPanel>
            ) : !connections || connections.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <PmPanel className={cn(PM_FILL_PANEL, "p-6")}>
                  <EmptyState
                    illustration={<EmptyDevicesIllustration />}
                    title="No repositories connected"
                    description="Connect GitHub, GitLab, or Bitbucket to link commits and PRs to your tickets."
                    action={{ label: "Add connection", onClick: handleOpenDialog }}
                  />
                </PmPanel>
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
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="git-provider">Provider</Label>
                <Select value={provider} onValueChange={handleProviderChange}>
                  <SelectTrigger id="git-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="git-repo-url">Repository URL *</Label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="git-repo-url"
                    className="pl-9"
                    placeholder="https://github.com/org/repo"
                    value={repoUrl}
                    onChange={handleRepoUrlChange}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="git-repo-name">Display name (optional)</Label>
                <Input
                  id="git-repo-name"
                  placeholder="org/repo"
                  value={repoName}
                  onChange={handleRepoNameChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelDialog}>
                Cancel
              </Button>
              <LoadingButton
                onClick={handleCreate}
                disabled={!repoUrl.trim()}
                isPending={createConnection.isPending}
                loadingText="Creating…"
              >
                Create connection
              </LoadingButton>
            </DialogFooter>
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
