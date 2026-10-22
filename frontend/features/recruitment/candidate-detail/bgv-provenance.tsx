"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useCandidateBgv, useInitiateBgv } from "@/hooks/api/hr/recruitment/bgv";

const DEFAULT_CHECKS = ["IDENTITY", "EDUCATION", "EMPLOYMENT"] as const;

interface Props {
  candidateId: number;
}

export function BgvProvenance({ candidateId }: Props) {
  const { data, isLoading, isError } = useCandidateBgv(candidateId);
  const initiate = useInitiateBgv(candidateId);
  const canManage = useCan("hr:requisitions:manage");

  const handleInitiate = useCallback(() => {
    initiate.mutate([...DEFAULT_CHECKS], {
      onSuccess: (view) => toast.success(view.summary),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [initiate]);

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (isError || !data) {
    return (
      <p className="text-xs text-muted-foreground">
        Who recorded this verdict could not be loaded.
      </p>
    );
  }

  const canStart = canManage && data.providerBlockedReason === null;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 flex-wrap">
        
        {data.agencyCleared ? (
          <Badge
            variant="outline"
            className="text-micro bg-status-success-surface text-status-success-ink border-status-success-rule"
          >
            Agency verified
          </Badge>
        ) : data.source === "MANUAL" ? (
          <Badge variant="outline" className="text-micro">
            Recorded by your team
          </Badge>
        ) : null}
        <p className="text-xs text-muted-foreground">{data.summary}</p>
      </div>

      {data.reference && (
        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          Agency case {data.reference}
        </p>
      )}

      {data.providerBlockedReason ? (
        <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
          {data.providerBlockedReason}
        </p>
      ) : (
        canStart && (
          <LoadingButton size="sm" onClick={handleInitiate} isPending={initiate.isPending}>
            Start agency check
          </LoadingButton>
        )
      )}
    </div>
  );
}
