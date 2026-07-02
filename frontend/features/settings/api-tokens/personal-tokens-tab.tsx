"use client";

import { useState, useCallback } from "react";
import { Key, Plus, Clock, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import {
  useUserApiTokens,
  useRevokeUserApiToken,
  type CreateUserApiTokenResponse,
  type UserApiToken,
} from "@/hooks/api/user-api-tokens";
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
import { CreateUserTokenSheet } from "./create-user-token-sheet";

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
    <Button variant="ghost" size="sm" onClick={handleClick} aria-label="Revoke token">
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
  showCreate: boolean;
  onShowCreateChange: (open: boolean) => void;
};

export function PersonalTokensTab({ showCreate, onShowCreateChange }: PersonalTokensTabProps) {
  const { data, isLoading } = useUserApiTokens();
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
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [revoking, revoke]);

  const handleOpenCreate = useCallback(() => onShowCreateChange(true), [onShowCreateChange]);
  const handleCloseCreated = useCallback(() => setCreatedRawToken(null), []);

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Personal tokens act on your behalf. Only you can see and manage them.
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
          <p className="text-sm">No personal access tokens yet</p>
          <Button size="sm" variant="outline" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Token
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => {
                const expired = isExpired(t.expiresAt);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {t.prefix}…
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
                        {t.scopes.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            No scopes
                          </span>
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
                      <RevokeTokenButton token={t} onRevoke={setRevoking} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateUserTokenSheet
        open={showCreate}
        onOpenChange={onShowCreateChange}
        onCreated={handleCreated}
      />
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
    </div>
  );
}
