"use client";

import { useState, useCallback } from "react";
import { Bot } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import {
  useAgentTokens,
  useRevokeAgentToken,
} from "@/hooks/api/build/agent-tokens";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/features/build/shared/pm-chrome";
import { TokenRow, TokenListSkeleton, TokensEmptyHint } from "./agent-token-list";
import { CreateTokenDialog } from "./agent-token-create-dialog";
import { SetupHelp } from "./agent-token-setup-help";

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
    <div className={cn(PM_PANEL, "space-y-4 p-4 sm:p-5")}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              AI Agent Access (MCP)
            </h3>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Tokens for Cursor or Claude Code. Agents can read tickets, comment, and move work to
            In Review — scoped to your access.
          </p>
        </div>
        <AnimatedIconButton
          size="sm"
          className="h-9 w-full shrink-0 sm:h-8 sm:w-auto"
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
      ) : tokens && tokens.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border/50">
          {tokens.map((token) => (
            <TokenRow key={token.id} token={token} onRevoke={handleRevoke} />
          ))}
        </div>
      ) : (
        <TokensEmptyHint />
      )}

      <SetupHelp />

      <CreateTokenDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={revokeId !== null}
        onOpenChange={handleRevokeDialogChange}
        title="Revoke token?"
        description="Any agent using this token will immediately lose access. This cannot be undone."
        confirmLabel="Revoke"
        destructive
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
}
