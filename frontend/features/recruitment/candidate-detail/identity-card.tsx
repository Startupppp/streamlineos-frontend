"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCandidateIdentity } from "@/hooks/api/hr/recruitment/identity";
import type { IdentityStatus } from "@/hooks/api/hr/recruitment/identity-schema";

/**
 * What each state means to a recruiter, in the words they would use.
 *
 * `UNAVAILABLE` and `FAILED` say different things on purpose. One is about our
 * setup and the other is about a person, and a shared label would let an
 * unconfigured integration read as a candidate who failed a check — which is
 * an accusation, made by a bug.
 */
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

/**
 * Identity verification, as it stands for this candidate.
 *
 * It exists because `approveOffer` now refuses when a job requires
 * verification and the candidate has none — and until this card there was no
 * screen anywhere that said why. A backend rule with no visible half is how a
 * recruiter ends up staring at a refusal they cannot act on.
 *
 * Nothing here is editable. The verification takes a vendor token produced by
 * the candidate's own session, so a typeable field would only invite somebody
 * to record a check that never happened.
 */
export function IdentityCard({ candidateId }: Props) {
  const { data, isLoading, isError } = useCandidateIdentity(candidateId);

  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;

  /*
    Silent on failure rather than an error card. This sits among several
    optional panels on a busy tab; a candidate whose identity check is simply
    not part of their story should not be told that something went wrong with
    a feature they were never using.
  */
  if (isError || !data) return null;

  /*
    Hidden entirely when nothing requires it and nothing has happened. Showing
    "Not started" on every candidate in an organisation that does not do
    identity checks would make an empty state look like an outstanding task.
  */
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
            {/*
              The suffix is the whole of what this product holds. Rendered with
              the mask so nobody reads four characters as a redaction of
              something we stored — we did not store it.
            */}
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
