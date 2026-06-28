"use client";

import { useState, useCallback } from "react";
import {
  GitBranch,
  Github,
  Gitlab,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import {
  useGitConnections,
  useCreateGitConnection,
  useUpdateGitConnection,
  useDeleteGitConnection,
  type GitConnection,
  type GitProvider,
  type CreatedGitConnection,
} from "@/lib/api/hooks/git-integration";
import { toast } from "sonner";

const PROVIDERS: { value: GitProvider; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
  { value: "bitbucket", label: "Bitbucket" },
];

function ProviderIcon({ provider, className }: { provider: GitProvider; className?: string }) {
  if (provider === "github") return <Github className={className} />;
  if (provider === "gitlab") return <Gitlab className={className} />;
  return <GitBranch className={className} />;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }, [value, label]);

  return (
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy} aria-label={`Copy ${label.toLowerCase()}`}>
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

function ConnectionRow({
  connection,
  onToggle,
  onDelete,
  isToggling,
}: {
  connection: GitConnection;
  onToggle: (connection: GitConnection) => void;
  onDelete: (id: number) => void;
  isToggling: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  const handleToggleReveal = useCallback(() => setRevealed((v) => !v), []);
  const handleToggle = useCallback(() => onToggle(connection), [connection, onToggle]);
  const handleDelete = useCallback(() => onDelete(connection.id), [connection.id, onDelete]);

  return (
    <Card className="shadow-noir">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <ProviderIcon provider={connection.provider} className="h-4.5 w-4.5 text-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">
                {connection.repoName || connection.repoUrl}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{connection.repoUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Badge variant={connection.isActive ? "default" : "secondary"} className="text-[10px]">
                {connection.isActive ? "Active" : "Paused"}
              </Badge>
              <Switch
                checked={connection.isActive}
                onCheckedChange={handleToggle}
                disabled={isToggling}
                aria-label={connection.isActive ? "Pause connection" : "Activate connection"}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete connection"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Webhook URL</Label>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
            <code className="text-xs font-mono truncate flex-1 min-w-0">{connection.webhookUrl}</code>
            <CopyButton value={connection.webhookUrl} label="Webhook URL" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Webhook secret</Label>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
            <code className="text-xs font-mono truncate flex-1 min-w-0">
              {revealed ? connection.maskedSecret : "••••••••••••"}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleToggleReveal}
              aria-label={revealed ? "Hide secret" : "Reveal secret"}
            >
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            The full secret is shown only once at creation. Recreate the connection if it is lost.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatedSecretDialog({
  created,
  onClose,
}: {
  created: CreatedGitConnection;
  onClose: () => void;
}) {
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) onClose();
  }, [onClose]);

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
            Connection created
          </DialogTitle>
          <DialogDescription>
            Copy the webhook secret now. It will not be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Webhook URL</Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
              <code className="text-xs font-mono truncate flex-1 min-w-0">{created.webhookUrl}</code>
              <CopyButton value={created.webhookUrl} label="Webhook URL" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Webhook secret</Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
              <code className="text-xs font-mono truncate flex-1 min-w-0">{created.webhookSecret}</code>
              <CopyButton value={created.webhookSecret} label="Secret" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetupInstructions() {
  return (
    <Card className="shadow-noir border-dashed">
      <CardHeader>
        <CardTitle className="text-sm">How it works</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
        <p>
          Add a connection, then paste the webhook URL into your repository settings
          (GitHub: <span className="font-mono">Settings → Webhooks</span>, GitLab:{" "}
          <span className="font-mono">Settings → Webhooks</span>).
        </p>
        <p>
          For GitHub set the content type to <span className="font-mono">application/json</span> and
          paste the secret into the <span className="font-mono">Secret</span> field. For GitLab paste
          the secret into the <span className="font-mono">Secret token</span> field.
        </p>
        <p>
          Reference a ticket in a commit message or pull request title using its key
          (<span className="font-mono">ABC-12-34</span>) or number (<span className="font-mono">#34</span>)
          to link it automatically.
        </p>
      </CardContent>
    </Card>
  );
}

export default function GitIntegrationPage() {
  const { data: connections, isLoading, isError, refetch } = useGitConnections();
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

  const handleDialogChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  }, [resetForm]);

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);

  const handleProviderChange = useCallback((value: string) => {
    setProvider(value as GitProvider);
  }, []);

  const handleRepoUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
  }, []);

  const handleRepoNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRepoName(e.target.value);
  }, []);

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
        onError: () => toast.error("Failed to create connection"),
      },
    );
  }, [provider, repoUrl, repoName, createConnection, resetForm]);

  const handleToggle = useCallback((connection: GitConnection) => {
    updateConnection.mutate(
      { id: connection.id, isActive: !connection.isActive },
      {
        onSuccess: () => toast.success(connection.isActive ? "Connection paused" : "Connection activated"),
        onError: () => toast.error("Failed to update connection"),
      },
    );
  }, [updateConnection]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteConnection.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Connection deleted");
        setDeleteId(null);
      },
      onError: () => toast.error("Failed to delete connection"),
    });
  }, [deleteId, deleteConnection]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleCloseCreated = useCallback(() => setCreated(null), []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <PageWrapper
      title="Git Integration"
      subtitle="Connect a repository to link commits and pull requests to tickets automatically"
      actions={
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add connection
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState variant="cards" rows={3} />
      ) : isError ? (
        <ErrorState
          title="Could not load connections"
          description="There was a problem loading your Git connections."
          onRetry={handleRetry}
        />
      ) : !connections || connections.length === 0 ? (
        <div className="flex-1 flex flex-col gap-4">
          <EmptyState
            illustration={<EmptyDevicesIllustration />}
            title="No repositories connected"
            description="Connect GitHub, GitLab, or Bitbucket to link commits and PRs to your tickets."
            action={{ label: "Add connection", onClick: handleOpenDialog }}
            className="flex-1"
          />
          <SetupInstructions />
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              onToggle={handleToggle}
              onDelete={setDeleteId}
              isToggling={updateConnection.isPending}
            />
          ))}
          <SetupInstructions />
        </div>
      )}

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
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            <Button variant="outline" onClick={() => handleDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createConnection.isPending || !repoUrl.trim()}>
              {createConnection.isPending ? "Creating..." : "Create connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {created && <CreatedSecretDialog created={created} onClose={handleCloseCreated} />}

      <AlertDialog open={deleteId !== null} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete connection?</AlertDialogTitle>
            <AlertDialogDescription>
              The webhook will stop linking commits and pull requests. Existing links are kept. This
              action cannot be undone.
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
  );
}
