"use client";

import { useState, useCallback } from "react";
import { Shield, ShieldOff, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  useApiTokens,
  useRevokeApiToken,
  type ApiToken,
  type CreateApiTokenResponse,
} from "@/hooks/api/api-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TokenCreatedDialog } from "./token-created-dialog";
import { CreateOrgTokenSheet } from "./create-org-token-sheet";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";

function RevokeTokenButton({
  token,
  onRevoke,
}: {
  token: ApiToken;
  onRevoke: (t: ApiToken) => void;
}) {
  function handleClick() {
    onRevoke(token);
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleClick}
      aria-label="Revoke token"
    >
      <ShieldOff className="h-4 w-4 text-status-warning-ink" />
    </Button>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

type OrgTokensTabProps = {
  showCreate: boolean;
  onShowCreateChange: (open: boolean) => void;
};

export function OrgTokensTab({ showCreate, onShowCreateChange }: OrgTokensTabProps) {
  const { data, error, isError, isLoading, refetch } = useApiTokens();
  const revoke = useRevokeApiToken();

  const [createdResult, setCreatedResult] = useState<CreateApiTokenResponse | null>(null);
  const [revoking, setRevoking] = useState<ApiToken | null>(null);

  const tokens = data?.data ?? [];

  const handleCreated = useCallback(
    (result: CreateApiTokenResponse) => {
      onShowCreateChange(false);
      setCreatedResult(result);
    },
    [onShowCreateChange],
  );

  const handleRevoke = useCallback(() => {
    if (!revoking) return;
    revoke.mutate(revoking.id, {
      onSuccess: () => {
        toast.success("Token revoked");
        setRevoking(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [revoking, revoke]);

  const handleOpenCreate = useCallback(() => onShowCreateChange(true), [onShowCreateChange]);
  const handleCloseCreated = useCallback(() => setCreatedResult(null), []);

  const columns: DataTableColumn<ApiToken>[] = [
    {
      key: "name",
      header: "Name",
      cell: (t) => (
        <div className="flex flex-col">
          <span className="font-medium">{t.name}</span>
          {t.description && (
            <TruncatedText text={t.description} className="text-micro text-muted-foreground max-w-[180px]" />
          )}
        </div>
      ),
    },
    {
      key: "prefix",
      header: "Prefix",
      cell: (t) => (
        <code className="text-dense bg-muted px-1.5 py-0.5 rounded">
          {t.keyPrefix}…
        </code>
      ),
    },
    {
      key: "scopes",
      header: "Capability",
      cell: (t) => (
        <Badge variant="outline" className="h-5 px-2 text-micro">
          {t.scopes.includes("leads:write") ? "Lead ingestion" : "Legacy CRM access"}
        </Badge>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      className: "text-muted-foreground",
      cell: (t) => {
        const expired = isExpired(t.expiresAt);
        return (
          <div className="flex items-center gap-1">
            {expired && <Clock className="h-3 w-3 text-destructive" />}
            <span className={expired ? "text-destructive" : ""}>{formatDate(t.expiresAt)}</span>
          </div>
        );
      },
    },
    {
      key: "lastUsed",
      header: "Last Used",
      className: "text-muted-foreground",
      cell: (t) => formatDate(t.lastUsedAt),
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => {
        const expired = isExpired(t.expiresAt);
        const hasCurrentCapability = t.scopes.includes("leads:write");
        const requiresRotation = !t.expiresAt || !hasCurrentCapability;
        if (t.isRevoked) {
          return (
            <Badge variant="secondary" className="h-4 text-micro px-1.5 py-0 text-destructive border-destructive/20 bg-destructive/10">
              Revoked
            </Badge>
          );
        }
        if (expired) {
          return (
            <Badge variant="secondary" className="h-4 text-micro px-1.5 py-0 text-status-warning-ink border-status-warning-rule bg-status-warning-surface">
              Expired
            </Badge>
          );
        }
        if (requiresRotation) {
          return (
            <Badge variant="secondary" className="h-4 border-status-warning-rule bg-status-warning-surface px-1.5 py-0 text-micro text-status-warning-ink">
              Rotate required
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="h-4 text-micro px-1.5 py-0 text-status-success-ink border-status-success-rule bg-status-success-surface">
            <Shield className="h-2.5 w-2.5 mr-0.5" />
            Active
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-10",
      className: "w-10",
      cell: (t) => (
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {!t.isRevoked && (
            <RevokeTokenButton token={t} onRevoke={setRevoking} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          className={CONTENT_FILL_PANEL}
          title="CRM API keys couldn’t be loaded"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : tokens.length === 0 ? (
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="security"
          title="No CRM API keys yet"
          description="Create a time-limited key when an external system needs to send leads into CRM."
          action={{ label: "New API Key", onClick: handleOpenCreate }}
        />
      ) : (
        <DataTable
          data={tokens}
          columns={columns}
          getRowKey={(t) => t.id}
          rowClassName={(t) => t.isRevoked ? "opacity-60" : ""}
          className="flex-1 min-h-0"
        />
      )}

      <CreateOrgTokenSheet
        open={showCreate}
        onOpenChange={onShowCreateChange}
        onCreated={handleCreated}
      />
      <TokenCreatedDialog
        open={!!createdResult}
        rawToken={createdResult?.token ?? null}
        onClose={handleCloseCreated}
      />
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title="Revoke API Key"
        description={`Revoke "${revoking?.name}"? Lead ingestion using this key will stop immediately. The audit record will be retained.`}
        onConfirm={handleRevoke}
        isPending={revoke.isPending}
        destructive
      />
    </>
  );
}
