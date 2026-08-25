"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  getLastPage,
  parsePage,
  parsePageSize,
  STANDARD_PAGE_SIZE_OPTIONS,
} from "@/lib/list-pagination";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("size"));
  const {
    data,
    error,
    isError,
    isLoading,
    isPlaceholderData,
    refetch,
  } = useUserApiTokens({ page, limit: pageSize });
  const revoke = useRevokeUserApiToken();

  const [createdRawToken, setCreatedRawToken] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<UserApiToken | null>(null);

  const tokens = data?.data ?? [];
  const pagination = data?.pagination;
  const isPageOutOfRange =
    !!pagination && page > getLastPage(pagination.total, pageSize);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const handlePageChange = useCallback(
    (nextPage: number) =>
      updateParams({ page: nextPage <= 1 ? null : String(nextPage) }),
    [updateParams],
  );
  const handlePageSizeChange = useCallback(
    (size: number) =>
      updateParams({
        size: size === DEFAULT_PAGE_SIZE ? null : String(size),
        page: null,
      }),
    [updateParams],
  );

  useEffect(() => {
    if (!pagination || isPlaceholderData) return;
    const lastPage = getLastPage(pagination.total, pageSize);
    if (page > lastPage) handlePageChange(lastPage);
  }, [handlePageChange, isPlaceholderData, page, pageSize, pagination]);

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
      {isLoading || isPageOutOfRange ? (
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
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: pagination?.total ?? 0,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
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
