"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { Bot } from "lucide-react";
import { CopyIcon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import {
  useAgentTokens,
  useCreateAgentToken,
  useRevokeAgentToken,
  type AgentToken,
  type CreateAgentTokenResponse,
} from "@/hooks/api/projects/agent-tokens";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PM_PANEL, PM_ROW } from "@/features/projects/shared/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";

const EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "never", label: "Never" },
] as const;

type ExpiryValue = (typeof EXPIRY_OPTIONS)[number]["value"];

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

type CreateFormValues = z.infer<typeof createSchema>;

function tokenStatus(token: AgentToken): "active" | "revoked" | "expired" {
  if (token.revokedAt) return "revoked";
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return "expired";
  return "active";
}

function StatusBadge({ status }: { status: "active" | "revoked" | "expired" }) {
  if (status === "active") {
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20">
        Active
      </Badge>
    );
  }
  if (status === "revoked") {
    return (
      <Badge variant="outline" className="border-destructive/40 text-red-600 bg-red-50 dark:bg-red-950/20">
        Revoked
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-50 dark:bg-amber-950/20">
      Expired
    </Badge>
  );
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "Never";
  const d = new Date(expiresAt);
  if (d < new Date()) return `Expired ${format(d, "MMM d, yyyy")}`;
  return format(d, "MMM d, yyyy");
}

function TokenRow({
  token,
  onRevoke,
}: {
  token: AgentToken;
  onRevoke: (id: string) => void;
}) {
  const status = tokenStatus(token);
  const handleRevoke = useCallback(() => onRevoke(token.id), [onRevoke, token.id]);

  return (
    <div className={cn(PM_ROW, "gap-3 py-3")}>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TruncatedText text={token.name} className="text-sm font-medium" />
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {token.tokenPrefix}…
          </code>
          <StatusBadge status={status} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Created {relativeDate(token.createdAt)}</span>
          {token.lastUsedAt ? <span>Last used {relativeDate(token.lastUsedAt)}</span> : null}
          <span>Expires {expiryLabel(token.expiresAt)}</span>
        </div>
      </div>
      {status === "active" ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleRevoke}
        >
          Revoke
        </Button>
      ) : null}
    </div>
  );
}

function TokenListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-border/60 last:border-0">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-14 rounded" />
        </div>
      ))}
    </div>
  );
}

function CopySnippetButton({ text }: { text: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy"
      {...hoverHandlers}
    >
      <CopyIcon ref={iconRef} size={14} />
    </button>
  );
}

function SetupHelp() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const cursorSnippet = JSON.stringify(
    {
      mcpServers: {
        streamlineos: {
          command: "node",
          args: ["<repo>/backend/scripts/mcp-server.mjs"],
          env: {
            STREAMLINEOS_TOKEN: "<your-token>",
            STREAMLINEOS_API_URL: apiUrl,
          },
        },
      },
    },
    null,
    2,
  );

  const claudeSnippet = `claude mcp add streamlineos -e STREAMLINEOS_TOKEN=<your-token> -e STREAMLINEOS_API_URL=${apiUrl} -- node <repo>/backend/scripts/mcp-server.mjs`;

  return (
    <Accordion type="single" collapsible className="mt-4">
      <AccordionItem value="setup" className="border border-border/60 rounded-lg px-4">
        <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
          Setup instructions
        </AccordionTrigger>
        <AccordionContent className="pb-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Full documentation at{" "}
            <code className="text-xs bg-muted px-1 rounded">docs/mcp-agent-access.md</code>.
          </p>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Cursor — <code className="bg-muted px-1 rounded">.cursor/mcp.json</code></p>
            <div className="relative bg-muted rounded-md p-3">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed pr-7">
                {cursorSnippet}
              </pre>
              <div className="absolute top-2 right-2">
                <CopySnippetButton text={cursorSnippet} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Claude Code</p>
            <div className="relative bg-muted rounded-md p-3">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all leading-relaxed pr-7">
                {claudeSnippet}
              </pre>
              <div className="absolute top-2 right-2">
                <CopySnippetButton text={claudeSnippet} />
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

type DialogPhase = "form" | "reveal";

function CreateTokenDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [phase, setPhase] = useState<DialogPhase>("form");
  const [expiry, setExpiry] = useState<ExpiryValue>("90");
  const [created, setCreated] = useState<CreateAgentTokenResponse | null>(null);
  const createToken = useCreateAgentToken();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  });

  const handleExpiryChange = useCallback((val: string) => {
    const matched = EXPIRY_OPTIONS.find((o) => o.value === val);
    if (matched) setExpiry(matched.value);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        form.reset();
        setPhase("form");
        setExpiry("90");
        setCreated(null);
      }
      onOpenChange(next);
    },
    [form, onOpenChange],
  );

  const handleSubmit = useCallback(
    (values: CreateFormValues) => {
      const expiresInDays = expiry === "never" ? undefined : Number(expiry);
      createToken.mutate(
        { name: values.name, expiresInDays },
        {
          onSuccess: (data) => {
            setCreated(data);
            setPhase("reveal");
          },
          onError: (err) => {
            toast.error(getErrorMessage(err));
          },
        },
      );
    },
    [createToken, expiry],
  );

  const handleCopyToken = useCallback(() => {
    if (!created) return;
    void navigator.clipboard.writeText(created.token).then(() => {
      toast.success("Token copied to clipboard");
    });
  }, [created]);

  const handleDone = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {phase === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>New agent token</DialogTitle>
              <DialogDescription>
                Tokens grant AI agents access to your projects. Keep them secret.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Cursor dev machine" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="token-expiry">Expiry</Label>
                  <Select value={expiry} onValueChange={handleExpiryChange}>
                    <SelectTrigger id="token-expiry">
                      <SelectValue placeholder="Select expiry" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDone}>
                    Cancel
                  </Button>
                  <LoadingButton
                    type="submit"
                    isPending={createToken.isPending}
                    loadingText="Creating…"
                  >
                    Create token
                  </LoadingButton>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Token created</DialogTitle>
              <DialogDescription>
                Copy your token now. You won&apos;t be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative bg-muted rounded-md p-3">
                <p className="text-xs font-mono break-all pr-8 leading-relaxed select-all">
                  {created?.token}
                </p>
                <div className="absolute top-2 right-2">
                  <AnimatedIconButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-1 text-muted-foreground hover:text-foreground"
                    onClick={handleCopyToken}
                    aria-label="Copy token"
                    icon={CopyIcon}
                    iconSize={14}
                  />
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
                <span className="text-amber-600 shrink-0 mt-px text-sm">⚠</span>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  This token will not be shown again. Store it securely before closing this dialog.
                </p>
              </div>
            </div>
            <DialogFooter>
              <AnimatedIconButton
                variant="outline"
                onClick={handleCopyToken}
                icon={CopyIcon}
                iconSize={16}
                iconClassName="mr-1.5"
              >
                Copy token
              </AnimatedIconButton>
              <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AgentTokensSection() {
  const { data: tokens, isLoading, isError, refetch } = useAgentTokens();
  const revokeToken = useRevokeAgentToken();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);

  const handleRevoke = useCallback((id: string) => setRevokeId(id), []);

  const handleRevokeDialogChange = useCallback((open: boolean) => {
    if (!open) setRevokeId(null);
  }, []);

  const handleConfirmRevoke = useCallback(() => {
    if (!revokeId) return;
    revokeToken.mutate(revokeId, {
      onSuccess: () => {
        toast.success("Token revoked");
        setRevokeId(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }, [revokeId, revokeToken]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className={cn(PM_PANEL, "space-y-5 p-5")}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="text-sm font-semibold">AI Agent Access (MCP)</h3>
          </div>
          <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
            Generate tokens to connect Cursor or Claude Code via the Model Context Protocol.
            Agents can read tickets, view attached images, post comments, and move tickets to
            In Review — scoped to your project access only.
          </p>
        </div>
        <AnimatedIconButton
          size="sm"
          className="shrink-0"
          onClick={handleOpenDialog}
          icon={PlusIcon}
          iconSize={16}
          iconClassName="mr-1"
        >
          New token
        </AnimatedIconButton>
      </div>

      {isLoading ? (
        <TokenListSkeleton />
      ) : isError ? (
        <ErrorState
          title="Could not load tokens"
          description="There was a problem loading your agent tokens."
          onRetry={handleRetry}
          compact
        />
      ) : !tokens || tokens.length === 0 ? (
        <EmptyState
          compact
          title="No agent tokens yet"
          description="Create a token to connect Cursor or Claude Code to your projects."
          action={{ label: "New token", onClick: handleOpenDialog }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/50">
          {tokens.map((token) => (
            <TokenRow key={token.id} token={token} onRevoke={handleRevoke} />
          ))}
        </div>
      )}

      <SetupHelp />

      <CreateTokenDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <AlertDialog open={revokeId !== null} onOpenChange={handleRevokeDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke token?</AlertDialogTitle>
            <AlertDialogDescription>
              Any agent using this token will immediately lose access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmRevoke}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
