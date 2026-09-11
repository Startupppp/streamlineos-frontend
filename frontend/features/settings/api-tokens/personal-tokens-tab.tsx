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
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { TokenCreatedDialog } from "./token-created-dialog";
import { CreateUserTokenSheet } from "./create-user-token-sheet";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import {
  DEFAULT_PAGE_SIZE,
  STANDARD_PAGE_SIZE_OPTIONS,
} from "@/lib/list-pagination";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";

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
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const currentCursor = cursorHistory.at(-1);
  const {
    data,
    error,
    isError,
    isLoading,
    refetch,
  } = useUserApiTokens({ cursor: currentCursor, limit: pageSize });
  const revoke = useRevokeUserApiToken();

  const [createdRawToken, setCreatedRawToken] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<UserApiToken | null>(null);

  const tokens = data?.data ?? [];
  const pagination = data?.pagination;
  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setCursorHistory([undefined]);
    },
    [],
  );

  const handlePrevious = useCallback(() => {
    setCursorHistory((history) => history.slice(0, -1));
  }, []);
  const handleNext = useCallback(() => {
    const nextCursor = pagination?.nextCursor;
    if (!nextCursor) return;
    setCursorHistory((history) => [...history, nextCursor]);
  }, [pagination?.nextCursor]);

  const handleCreated = useCallback(
    (result: CreateUserApiTokenResponse) => {
      onShowCreateChange(false);
      setCreatedRawToken(result.rawToken);
      setCursorHistory([undefined]);
      toast.success("Personal access token created");
    },
    [onShowCreateChange],
  );

  const handleRevoke = useCallback(() => {
    if (!revoking) return;
    revoke.mutate(revoking.id, {
      onSuccess: () => {
        toast.success("Token revoked");
        setCursorHistory([undefined]);
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
        <code className="text-dense bg-muted px-1.5 py-0.5 rounded">
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
            <Badge key={s} variant="outline" className="h-4 text-micro px-1.5 py-0">
              {s}
            </Badge>
          ))}
          {t.scopes.length > 3 && (
            <Badge variant="outline" className="h-4 text-micro px-1.5 py-0">
              +{t.scopes.length - 3}
            </Badge>
          )}
          {t.scopes.length === 0 && (
            <span className="text-dense text-muted-foreground">No scopes</span>
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
            <Badge variant="secondary" className="h-5 px-2 text-micro text-status-warning-ink">
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
        <DataTableSkeleton rows={8} columns={6} className="flex-1" />
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

      {(cursorHistory.length > 1 || pagination?.hasMore) && (
        <CursorPageControls
          page={cursorHistory.length}
          hasNext={pagination?.hasMore ?? false}
          onPrevious={handlePrevious}
          onNext={handleNext}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={STANDARD_PAGE_SIZE_OPTIONS}
          className="mt-2"
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
