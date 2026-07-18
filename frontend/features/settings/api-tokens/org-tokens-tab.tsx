"use client";

import { useState, useCallback } from "react";
import { Shield, ShieldOff, Clock } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import {
  useApiTokens,
  useRevokeApiToken,
  useDeleteApiToken,
  type ApiToken,
  type CreateApiTokenResponse,
} from "@/hooks/api/api-tokens";
import { getApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TokenCreatedDialog } from "./token-created-dialog";
import { CreateOrgTokenSheet } from "./create-org-token-sheet";

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
      <ShieldOff className="h-4 w-4 text-amber-600" />
    </Button>
  );
}

function DeleteTokenButton({
  token,
  onDelete,
}: {
  token: ApiToken;
  onDelete: (t: ApiToken) => void;
}) {
  function handleClick() {
    onDelete(token);
  }
  return (
    <AnimatedIconButton
      icon={Trash2Icon}
      iconSize={16}
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-destructive hover:text-destructive"
      onClick={handleClick}
      aria-label="Delete token"
    />
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
  const { data, isLoading } = useApiTokens();
  const revoke = useRevokeApiToken();
  const del = useDeleteApiToken();

  const [createdResult, setCreatedResult] = useState<CreateApiTokenResponse | null>(null);
  const [revoking, setRevoking] = useState<ApiToken | null>(null);
  const [deleting, setDeleting] = useState<ApiToken | null>(null);

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
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [revoking, revoke]);

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Token deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [deleting, del]);

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
            <TruncatedText text={t.description} className="text-[10px] text-muted-foreground max-w-[180px]" />
          )}
        </div>
      ),
    },
    {
      key: "prefix",
      header: "Prefix",
      cell: (t) => (
        <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">
          {t.keyPrefix}…
        </code>
      ),
    },
    {
      key: "scopes",
      header: "Scopes",
      cell: (t) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {t.scopes.slice(0, 3).map((s) => (
            <Badge key={s} variant="outline" className="h-4 text-[9px] px-1.5 py-0">
              {s}
            </Badge>
          ))}
          {t.scopes.length > 3 && (
            <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0">
              +{t.scopes.length - 3}
            </Badge>
          )}
        </div>
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
        if (t.isRevoked) {
          return (
            <Badge variant="secondary" className="h-4 text-[9px] px-1.5 py-0 text-destructive border-destructive/20 bg-destructive/10">
              Revoked
            </Badge>
          );
        }
        if (expired) {
          return (
            <Badge variant="secondary" className="h-4 text-[9px] px-1.5 py-0 text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
              Expired
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400">
            <Shield className="h-2.5 w-2.5 mr-0.5" />
            Active
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-20",
      className: "w-20",
      cell: (t) => (
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {!t.isRevoked && (
            <RevokeTokenButton token={t} onRevoke={setRevoking} />
          )}
          <DeleteTokenButton token={t} onDelete={setDeleting} />
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
      ) : tokens.length === 0 ? (
        <EmptyState
          illustrationPreset="security"
          title="No organization tokens yet"
          description="Organization tokens provide access to shared resources and are visible to administrators."
          action={{ label: "New Token", onClick: handleOpenCreate }}
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
        title="Revoke Token"
        description={`Revoke "${revoking?.name}"? API calls using this token will immediately fail.`}
        onConfirm={handleRevoke}
        isPending={revoke.isPending}
        destructive
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete Token"
        description={`Permanently delete "${deleting?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={del.isPending}
        destructive
      />
    </>
  );
}
