"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCandidateIdentity } from "@/hooks/api/hr/recruitment/identity";
import type { IdentityStatus } from "@/hooks/api/hr/recruitment/identity-schema";

const STATUS_LABEL: Record<IdentityStatus, string> = {
  NOT_STARTED: "Not started",
  PENDING: "Check running",
  VERIFIED: "Verified",
  FAILED: "Did not pass",
  UNAVAILABLE: "Could not be checked",
};

const STATUS_VARIANT: Record<IdentityStatus, "secondary" | "outline" | "destructive"> = {
  NOT_STARTED: "outline",
  PENDING: "outline",
  VERIFIED: "secondary",
  FAILED: "destructive",
  UNAVAILABLE: "outline",
};

interface Props {
  candidateId: number;
}

export function IdentityCard({ candidateId }: Props) {
  const { data, isLoading, isError } = useCandidateIdentity(candidateId);

  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;

  if (isError || !data) return null;

  if (!data.requiredByAJob && data.status === "NOT_STARTED") return null;

  return (
    <div className="rounded-xl border px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Identity verification</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={STATUS_VARIANT[data.status]} className="text-micro">
            {STATUS_LABEL[data.status]}
          </Badge>
          {data.requiredByAJob && (
            <Badge variant="outline" className="text-micro">
              Required for this role
            </Badge>
          )}
        </div>
      </div>

      <dl className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
        {data.last4 && (
          <div className="flex gap-1.5">
            <dt>Document</dt>
            
            <dd className="font-mono text-foreground">••••{data.last4}</dd>
          </div>
        )}
        {data.reference && (
          <div className="flex gap-1.5">
            <dt>Case</dt>
            <dd className="font-mono text-foreground">{data.reference}</dd>
          </div>
        )}
      </dl>

      {data.providerBlockedReason && (
        <p className="text-xs text-muted-foreground">{data.providerBlockedReason}</p>
      )}

      {data.requiredByAJob && data.status !== "VERIFIED" && (
        <p className="text-xs text-muted-foreground">
          An offer for this role cannot be finalised until the check passes.
        </p>
      )}
    </div>
  );
}
