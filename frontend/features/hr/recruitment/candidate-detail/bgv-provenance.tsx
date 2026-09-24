"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useCandidateBgv, useInitiateBgv } from "@/hooks/api/hr/recruitment/bgv";

/**
 * The three checks an accepted offer opens by default, offered here as the same
 * package so a check started by hand matches one started automatically.
 */
const DEFAULT_CHECKS = ["IDENTITY", "EDUCATION", "EMPLOYMENT"] as const;

interface Props {
  candidateId: number;
}

/**
 * Who said this candidate is cleared, and whether an agency could be asked.
 *
 * Separate from the tracker card because the tracker edits a recruiter's own
 * record while this reads the verdict's provenance — and because the sentence
 * it renders has to come from the server per candidate rather than being a
 * constant on the page.
 */
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
        {/*
          The badge is the one thing on this card that distinguishes a
          recruiter's record from an agency's verdict. Both can read CLEARED and
          only one of them is evidence.
        */}
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
