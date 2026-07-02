"use client";

import { useState, useCallback } from "react";
import { Key, Plus, Shield, ShieldOff, Clock, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TokenCreatedDialog } from "./token-created-dialog";
import { CreateOrgTokenSheet } from "./create-org-token-sheet";

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

  const [createdResult, setCreatedResult] =
    useState<CreateApiTokenResponse | null>(null);
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

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Tokens with access to your organization&apos;s resources. Visible to
        administrators.
      </p>

      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="flex min-h-[calc(100vh-320px)] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card text-muted-foreground">
          <Key className="h-8 w-8 opacity-30" />
          <p className="text-sm">No organization tokens yet</p>
          <Button size="sm" variant="outline" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Token
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((t) => {
              const expired = isExpired(t.expiresAt);
              return (
                <TableRow
                  key={t.id}
                  className={t.isRevoked ? "opacity-60" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{t.name}</span>
                      {t.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {t.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {t.keyPrefix}…
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {t.scopes.slice(0, 3).map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                        >
                          {s}
                        </Badge>
                      ))}
                      {t.scopes.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                        >
                          +{t.scopes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {expired && (
                        <Clock className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className={expired ? "text-destructive" : ""}>
                        {formatDate(t.expiresAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(t.lastUsedAt)}
                  </TableCell>
                  <TableCell>
                    {t.isRevoked ? (
                      <Badge
                        variant="secondary"
                        className="text-destructive border-destructive/20 bg-destructive/10"
                      >
                        Revoked
                      </Badge>
                    ) : expired ? (
                      <Badge
                        variant="secondary"
                        className="text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                      >
                        Expired
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!t.isRevoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevoking(t)}
                          title="Revoke"
                        >
                          <ShieldOff className="h-4 w-4 text-amber-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(t)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
    </div>
  );
}
