"use client";

import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { ArrowRightLeft, Trash2, Users, Clock } from "lucide-react";
import { formatRelative } from "date-fns";
import { DashboardGate } from "@/components/shared/dashboard-gate";

interface Delegation {
  id: string;
  orgId: string;
  delegatorId: string;
  delegateeId: string;
  permissions: string[];
  startsAt: string;
  endsAt: string;
  reason: string | null;
  status: string;
  createdAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
}

export default function DelegationsPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <DelegationsContent />
    </DashboardGate>
  );
}

function DelegationsContent() {
  const queryClient = useQueryClient();
  const [revoking, setRevoking] = useState<string | null>(null);

  const { data: received, isLoading: loadingReceived } = useQuery<Delegation[]>({
    queryKey: ["delegations", "received"],
    queryFn: () => apiClient.get<Delegation[]>("/access/delegations"),
    staleTime: 60_000,
  });

  const { data: given, isLoading: loadingGiven } = useQuery<Delegation[]>({
    queryKey: ["delegations", "given"],
    queryFn: () => apiClient.get<Delegation[]>("/access/delegations/given"),
    staleTime: 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/access/delegations/${id}`),
    onSuccess: () => {
      toast.success("Delegation revoked");
      void queryClient.invalidateQueries({ queryKey: ["delegations"] });
      setRevoking(null);
    },
    onError: (error) => {
      toast.error(getApiError(error));
      setRevoking(null);
    },
  });

  const handleRevoke = useCallback((id: string) => {
    setRevoking(id);
    revokeMutation.mutate(id);
  }, [revokeMutation]);

  const activeGiven = (given ?? []).filter((d) => d.status === "ACTIVE" && new Date(d.endsAt) > new Date());
  const expiredOrRevoked = (given ?? []).filter((d) => d.status !== "ACTIVE" || new Date(d.endsAt) <= new Date());

  return (
    <PageWrapper
      title="Permission Delegations"
      subtitle="Manage permissions you've delegated to others or received from others"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Delegated to you
            </CardTitle>
            <CardDescription>Active permissions another user has delegated to you.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReceived ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : !received?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ArrowRightLeft className="h-9 w-9 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium">No delegations received</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When another user delegates permissions to you they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {received.map((d) => (
                  <DelegationRow key={d.id} delegation={d} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Delegations you granted
            </CardTitle>
            <CardDescription>Permissions you have delegated to other users.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGiven ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : !activeGiven.length && !expiredOrRevoked.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="h-9 w-9 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium">No delegations granted</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven&apos;t delegated any permissions to other users.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeGiven.map((d) => (
                  <DelegationRow
                    key={d.id}
                    delegation={d}
                    canRevoke
                    onRevoke={handleRevoke}
                    isRevoking={revoking === d.id}
                  />
                ))}
                {expiredOrRevoked.map((d) => (
                  <DelegationRow key={d.id} delegation={d} isExpired />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

interface DelegationRowProps {
  delegation: Delegation;
  canRevoke?: boolean;
  onRevoke?: (id: string) => void;
  isRevoking?: boolean;
  isExpired?: boolean;
}

function DelegationRow({ delegation, canRevoke, onRevoke, isRevoking, isExpired }: DelegationRowProps) {
  const handleRevoke = useCallback(() => onRevoke?.(delegation.id), [delegation.id, onRevoke]);
  const isRevoked = delegation.status === "REVOKED";
  const isExpiredByTime = !isRevoked && new Date(delegation.endsAt) <= new Date();

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{delegation.delegateeId}</span>
          <div className="flex gap-1 flex-wrap">
            {delegation.permissions.slice(0, 3).map((p) => (
              <Badge key={p} variant="outline" className="text-xs font-mono">
                {p}
              </Badge>
            ))}
            {delegation.permissions.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{delegation.permissions.length - 3} more
              </Badge>
            )}
          </div>
          {(isExpired || isRevoked || isExpiredByTime) && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {isRevoked ? "Revoked" : "Expired"}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
          {delegation.reason && <span>{delegation.reason}</span>}
          <span className={(isExpired || isExpiredByTime) ? "text-red-500" : ""}>
            {isExpired || isExpiredByTime || isRevoked ? "Ended" : "Ends"}{" "}
            {formatRelative(new Date(delegation.endsAt), new Date())}
          </span>
        </div>
      </div>
      {canRevoke && !isExpired && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:bg-destructive/10"
          onClick={handleRevoke}
          disabled={isRevoking}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
