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
    <>
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <EmptyState
          illustrationPreset="security"
          title="No personal access tokens yet"
          description="Personal tokens act on your behalf and are only visible to you."
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
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => {
                const expired = isExpired(t.expiresAt);
                return (
                  <TableRow key={t.id} className="h-8 hover:bg-muted/30 transition-colors">
                    <TableCell className="px-2 py-1 text-[11px] font-medium">{t.name}</TableCell>
                    <TableCell className="px-2 py-1">
                      <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">
                        {t.prefix}…
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
                        {t.scopes.length === 0 && (
                          <span className="text-[11px] text-muted-foreground">No scopes</span>
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
    </>
  );
}
