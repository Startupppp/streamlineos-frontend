"use client";

import { useState, useCallback } from "react";
import { Key, Shield, ShieldOff, Clock, Trash2 } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
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

  return (
    <>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <EmptyState
          illustration={<Key className="h-8 w-8 text-muted-foreground/40" />}
          title="No organization tokens yet"
          description="Organization tokens provide access to shared resources and are visible to administrators."
          action={{ label: "New Token", onClick: handleOpenCreate }}
          className="min-h-[40vh]"
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Prefix</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Scopes</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Expires</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Last Used</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => {
                const expired = isExpired(t.expiresAt);
                return (
                  <TableRow key={t.id} className={`h-8 hover:bg-muted/30 transition-colors${t.isRevoked ? " opacity-60" : ""}`}>
                    <TableCell className="px-2 py-1 text-[11px]">
                      <div className="flex flex-col">
                        <span className="font-medium">{t.name}</span>
                        {t.description && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {t.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">
                        {t.keyPrefix}…
                      </code>
                    </TableCell>
                    <TableCell className="px-2 py-1">
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
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {expired && <Clock className="h-3 w-3 text-destructive" />}
                        <span className={expired ? "text-destructive" : ""}>{formatDate(t.expiresAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">
                      {formatDate(t.lastUsedAt)}
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      {t.isRevoked ? (
                        <Badge variant="secondary" className="h-4 text-[9px] px-1.5 py-0 text-destructive border-destructive/20 bg-destructive/10">
                          Revoked
                        </Badge>
                      ) : expired ? (
                        <Badge variant="secondary" className="h-4 text-[9px] px-1.5 py-0 text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400">
                          <Shield className="h-2.5 w-2.5 mr-0.5" />
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <div className="flex items-center gap-0.5">
                        {!t.isRevoked && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setRevoking(t)}
                            aria-label="Revoke token"
                          >
                            <ShieldOff className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleting(t)}
                          aria-label="Delete token"
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
        </div>
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
