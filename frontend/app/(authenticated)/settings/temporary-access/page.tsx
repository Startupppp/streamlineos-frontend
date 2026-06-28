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
import { Plus, Clock, Trash2, Users, CalendarClock } from "lucide-react";
import { formatRelative } from "date-fns";
import { DashboardGate } from "@/components/shared/dashboard-gate";

interface TemporaryAssignment {
  id: number;
  userId: string;
  userName: string | null;
  roleId: number;
  roleName: string;
  expiresAt: string | null;
  reason: string | null;
  assignedBy: string | null;
  createdAt: string;
}

export default function TemporaryAccessPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <TemporaryAccessContent />
    </DashboardGate>
  );
}

function TemporaryAccessContent() {
  const queryClient = useQueryClient();
  const [revoking, setRevoking] = useState<number | null>(null);

  const { data: assignments, isLoading } = useQuery<TemporaryAssignment[]>({
    queryKey: ["temporary-access"],
    queryFn: () => apiClient.get<TemporaryAssignment[]>("/access/temporary"),
    staleTime: 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/access/temporary/${id}`),
    onSuccess: () => {
      toast.success("Access revoked");
      void queryClient.invalidateQueries({ queryKey: ["temporary-access"] });
      setRevoking(null);
    },
    onError: (error) => {
      toast.error(getApiError(error));
      setRevoking(null);
    },
  });

  const handleRevoke = useCallback((id: number) => {
    setRevoking(id);
    revokeMutation.mutate(id);
  }, [revokeMutation]);

  const active = (assignments ?? []).filter((a) => !a.expiresAt || new Date(a.expiresAt) > new Date());
  const expired = (assignments ?? []).filter((a) => a.expiresAt && new Date(a.expiresAt) <= new Date());

  return (
    <PageWrapper
      title="Temporary Access"
      subtitle="Manage time-bound role assignments"
      actions={
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" /> Grant temporary access
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Active temporary assignments
            </CardTitle>
            <CardDescription>Role assignments with an expiry date that are still active.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : active.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium">No active temporary assignments</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Grant time-bound role access for contractors or temporary staff.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {active.map((assignment) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    onRevoke={handleRevoke}
                    isRevoking={revoking === assignment.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {expired.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Expired assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expired.map((assignment) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    onRevoke={handleRevoke}
                    isRevoking={revoking === assignment.id}
                    isExpired
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

interface AssignmentRowProps {
  assignment: TemporaryAssignment;
  onRevoke: (id: number) => void;
  isRevoking: boolean;
  isExpired?: boolean;
}

function AssignmentRow({ assignment, onRevoke, isRevoking, isExpired }: AssignmentRowProps) {
  const handleRevoke = useCallback(() => onRevoke(assignment.id), [assignment.id, onRevoke]);

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{assignment.userName ?? assignment.userId}</span>
          <Badge variant="outline" className="text-xs">
            {assignment.roleName}
          </Badge>
          {isExpired && (
            <Badge variant="outline" className="text-xs text-muted-foreground">Expired</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
          {assignment.reason && <span>Reason: {assignment.reason}</span>}
          {assignment.expiresAt && (
            <span className={isExpired ? "text-red-500" : ""}>
              {isExpired ? "Expired" : "Expires"} {formatRelative(new Date(assignment.expiresAt), new Date())}
            </span>
          )}
        </div>
      </div>
      {!isExpired && (
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
