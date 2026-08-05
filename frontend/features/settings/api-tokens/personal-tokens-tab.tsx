"use client";

import { useState, useCallback } from "react";
import { Clock, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import {
  useUserApiTokens,
  useRevokeUserApiToken,
  type CreateUserApiTokenResponse,
  type UserApiToken,
} from "@/hooks/api/user-api-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TokenCreatedDialog } from "./token-created-dialog";
import { CreateUserTokenSheet } from "./create-user-token-sheet";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";

function RevokeTokenButton({
  token,
  onRevoke,
}: {
  token: UserApiToken;
  onRevoke: (token: UserApiToken) => void;
}) {
  function handleClick() {
    onRevoke(token);
  }
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClick} aria-label="Revoke token">
      <ShieldOff className="h-4 w-4 text-amber-600" />
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

type PersonalTokensTabProps = {
  canCreate: boolean;
  showCreate: boolean;
  onShowCreateChange: (open: boolean) => void;
};

export function PersonalTokensTab({
  canCreate,
  showCreate,
  onShowCreateChange,
}: PersonalTokensTabProps) {
  const { data, error, isError, isLoading, refetch } = useUserApiTokens();
  const revoke = useRevokeUserApiToken();

  const [createdRawToken, setCreatedRawToken] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<UserApiToken | null>(null);

  const tokens = data ?? [];

  const handleCreated = useCallback(
    (result: CreateUserApiTokenResponse) => {
      onShowCreateChange(false);
      setCreatedRawToken(result.rawToken);
      toast.success("Personal access token created");
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
  const handleCloseCreated = useCallback(() => setCreatedRawToken(null), []);

  const columns: DataTableColumn<UserApiToken>[] = [
    {
      key: "name",
      header: "Name",
      className: "font-medium",
      cell: (t) => t.name,
    },
    {
      key: "prefix",
      header: "Prefix",
      cell: (t) => (
        <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">
          {t.prefix}…
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
          {t.scopes.length === 0 && (
            <span className="text-[11px] text-muted-foreground">No scopes</span>
          )}
        </div>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      className: "text-muted-foreground",
      cell: (t) => {
        if (!t.expiresAt) {
          return (
            <Badge variant="secondary" className="h-5 px-2 text-[10px] text-amber-700">
              Disabled · rotate
            </Badge>
          );
        }
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
      key: "actions",
      header: "",
      headerClassName: "w-8",
      className: "w-8",
      cell: (t) =>
        canCreate ? (
          <RevokeTokenButton token={t} onRevoke={setRevoking} />
        ) : null,
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
          title="Personal tokens couldn’t be loaded"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : tokens.length === 0 ? (
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="security"
          title="No personal access tokens yet"
          description="Create a time-limited token for scripts and developer tools. It can never exceed your current access."
          action={
            canCreate ? { label: "New Token", onClick: handleOpenCreate } : undefined
          }
        />
      ) : (
        <DataTable
          data={tokens}
          columns={columns}
          getRowKey={(t) => t.id}
          className="flex-1 min-h-0"
        />
      )}

      {canCreate ? (
        <CreateUserTokenSheet
          open={showCreate}
          onOpenChange={onShowCreateChange}
          onCreated={handleCreated}
        />
      ) : null}
      <TokenCreatedDialog
        open={!!createdRawToken}
        rawToken={createdRawToken}
        onClose={handleCloseCreated}
      />
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title="Revoke Token"
        description={`Revoke "${revoking?.name}"? This token will immediately stop working.`}
        onConfirm={handleRevoke}
        isPending={revoke.isPending}
        destructive
      />
    </>
  );
}
