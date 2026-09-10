"use client";

import { useCallback, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Bot, KeyRound, Plug, ShieldCheck } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { LoadingState } from "@/components/shared/loading-state";
import { useAccess, useCan } from "@/hooks/api/access";
import {
  useCrmAgentTokens,
  useCrmMcpTools,
  useRevokeCrmAgentToken,
} from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AgentToken } from "@/types/projects";
import { CrmMcpTokenDialog } from "./mcp-token-dialog";
import { scopeLabel } from "./mcp-scopes";

function tokenState(token: AgentToken): "active" | "revoked" | "expired" {
  if (token.revokedAt) return "revoked";
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return "expired";
  return "active";
}

function dateLabel(value: string | null): string {
  if (!value) return "Never";
  return format(new Date(value), "MMM d, yyyy");
}

function relativeDate(value: string | null): string {
  if (!value) return "Never";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function TokenStatusBadge({ state }: { state: ReturnType<typeof tokenState> }) {
  if (state === "active") {
    return (
      <Badge className="border-status-success-rule bg-status-success-surface text-status-success-ink" variant="outline">
        Active
      </Badge>
    );
  }
  if (state === "revoked") {
    return (
      <Badge className="border-status-danger-rule bg-status-danger-surface text-status-danger-ink" variant="outline">
        Revoked
      </Badge>
    );
  }
  return (
    <Badge className="border-status-warning-rule bg-status-warning-surface text-status-warning-ink" variant="outline">
      Expired
    </Badge>
  );
}

function TokenSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface TokenRowProps {
  token: AgentToken;
  onRevoke: (tokenId: string | number) => void;
}

function TokenRow({ token, onRevoke }: TokenRowProps) {
  const state = tokenState(token);
  const handleRevoke = useCallback(() => onRevoke(token.id), [onRevoke, token.id]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{token.name}</p>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {token.tokenPrefix}...
          </code>
          <TokenStatusBadge state={state} />
        </div>
        <div className="flex flex-wrap gap-1">
          {token.scopes.map((scope) => (
            <Badge key={scope} variant="secondary" className="text-micro">
              {scopeLabel(scope)}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Created {relativeDate(token.createdAt)}</span>
          <span>Last used {relativeDate(token.lastUsedAt)}</span>
          <span>Expires {dateLabel(token.expiresAt)}</span>
        </div>
      </div>
      {state === "active" ? (
        <Button
          type="button"
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

export function CrmMcpSettings() {
  const { isPending: accessPending } = useAccess();
  const canViewTokens = useCan("settings:api-tokens:read");
  const canWriteTokens = useCan("settings:api-tokens:write");
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | number | null>(null);
  const tokensQuery = useCrmAgentTokens();
  const toolsQuery = useCrmMcpTools();
  const revokeToken = useRevokeCrmAgentToken();

  const tokens = tokensQuery.data ?? [];
  const tools = toolsQuery.data?.tools ?? [];
  const activeCount = useMemo(
    () => tokens.filter((token) => tokenState(token) === "active").length,
    [tokens],
  );
  const scopeCount = useMemo(
    () => new Set(tokens.flatMap((token) => token.scopes)).size,
    [tokens],
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRetryTokens = useCallback(() => {
    void tokensQuery.refetch();
  }, [tokensQuery]);
  const handleRetryTools = useCallback(() => {
    void toolsQuery.refetch();
  }, [toolsQuery]);
  const handleRevokeChange = useCallback((open: boolean) => {
    if (!open) setRevokeId(null);
  }, []);
  const handleConfirmRevoke = useCallback(() => {
    if (revokeId === null) return;
    revokeToken.mutate(revokeId, {
      onSuccess: () => {
        toast.success("Token revoked");
        setRevokeId(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [revokeId, revokeToken]);

  return (
    <PageWrapper
      title="MCP Agent Access"
      subtitle="Create CRM-scoped agent tokens and inspect the tools exposed to MCP clients."
      actions={
        canWriteTokens ? (
          <AnimatedIconButton
            onClick={handleOpenCreate}
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
          >
            New token
          </AnimatedIconButton>
        ) : undefined
      }
    >
      {accessPending ? (
        <LoadingState variant="page" />
      ) : !canViewTokens ? (
        <NoPermissionState permission="settings:api-tokens:read" />
      ) : (
        <div className="space-y-4">
          <StatCardGrid cols={3}>
            <StatCard label="Active tokens" value={activeCount} icon={KeyRound} tone="blue" />
            <StatCard label="Available tools" value={tools.length} icon={Plug} tone="default" />
            <StatCard label="Issued scopes" value={scopeCount} icon={ShieldCheck} tone="emerald" />
          </StatCardGrid>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <KeyRound className="h-4 w-4 text-primary" aria-hidden />
                  Agent tokens
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tokensQuery.isLoading ? (
                  <TokenSkeleton />
                ) : tokensQuery.isError ? (
                  <ErrorState
                    compact
                    title="Could not load tokens"
                    description="There was a problem loading CRM agent tokens."
                    onRetry={handleRetryTokens}
                  />
                ) : tokens.length === 0 ? (
                  <EmptyState
                    compact
                    title="No CRM agent tokens"
                    description="Create a token to let an MCP client use CRM tools through the API."
                  />
                ) : (
                  <div className="space-y-2">
                    {tokens.map((token) => (
                      <TokenRow
                        key={String(token.id)}
                        token={token}
                        onRevoke={setRevokeId}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bot className="h-4 w-4 text-primary" aria-hidden />
                  CRM MCP tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                {toolsQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 rounded-lg" />
                    ))}
                  </div>
                ) : toolsQuery.isError ? (
                  <ErrorState
                    compact
                    title="Could not load tools"
                    description="There was a problem loading the CRM MCP tool catalog."
                    onRetry={handleRetryTools}
                  />
                ) : tools.length === 0 ? (
                  <EmptyState
                    compact
                    title="No tools available"
                    description="Your current CRM permissions do not expose any MCP tools."
                  />
                ) : (
                  <div className="space-y-2">
                    {tools.map((tool) => (
                      <div key={tool.name} className="rounded-lg border border-border/70 p-3">
                        <p className="font-mono text-dense font-medium">{tool.name}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {tool.description}
                        </p>
                        <Badge variant="secondary" className="mt-2 text-micro">
                          {tool.requiredPermission}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <CrmMcpTokenDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={revokeId !== null}
        onOpenChange={handleRevokeChange}
        title="Revoke token?"
        description="Any MCP client using this token will lose access immediately."
        confirmLabel="Revoke"
        destructive
        isPending={revokeToken.isPending}
        onConfirm={handleConfirmRevoke}
      />
    </PageWrapper>
  );
}
