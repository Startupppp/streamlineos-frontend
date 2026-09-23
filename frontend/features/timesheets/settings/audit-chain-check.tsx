"use client";

import { useCallback } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useVerifyAuditChain } from "@/hooks/api/timesheets-core/audit-verify";
import type { AuditChainVerification } from "@/features/timesheets/types";

function describe(result: AuditChainVerification) {
  if (!result.valid) {
    return {
      tone: "danger" as const,
      Icon: ShieldAlert,
      headline: "The record has been altered",
      detail:
        `Event ${result.brokenAtId} does not match the hash written when it was ` +
        `recorded, so something changed it or the event before it after the fact. ` +
        `${result.checked.toLocaleString()} of ${result.total.toLocaleString()} events were read before the break.`,
    };
  }
  if (result.truncated) {
    return {
      tone: "warning" as const,
      Icon: ShieldQuestion,
      headline: "Intact as far as this check could read",
      detail:
        `${result.verified.toLocaleString()} events verified, out of ` +
        `${result.total.toLocaleString()} in total. The check reads the oldest events ` +
        `first and stops at its limit, so the most recent ones were not examined. ` +
        `This is not a clean bill of health for the whole trail.`,
    };
  }
  if (result.legacyRows > 0) {
    return {
      tone: "warning" as const,
      Icon: ShieldQuestion,
      headline: "Intact, but part of the trail cannot be checked",
      detail:
        `${result.verified.toLocaleString()} events verified and ` +
        `${result.legacyRows.toLocaleString()} written before hashing existed. ` +
        `Those older rows carry no hash, so this check can neither confirm nor ` +
        `deny that they are unchanged.`,
    };
  }
  return {
    tone: "success" as const,
    Icon: ShieldCheck,
    headline: "The record is intact",
    detail:
      `All ${result.verified.toLocaleString()} events match the hashes written when ` +
      `they were recorded, and each one links to the one before it.`,
  };
}

export function AuditChainCheck() {
  const { data, isFetching, isError, error, refetch, canVerify } =
    useVerifyAuditChain();

  const handleVerify = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (!canVerify) return null;

  const outcome = data ? describe(data) : null;
  const tone = outcome ? statusToneClasses(outcome.tone) : null;

  return (
    <Card className="mb-3">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {outcome && tone ? (
            <>
              <p className={cn("flex items-center gap-2 text-sm font-medium", tone.ink)}>
                <outcome.Icon className="h-4 w-4 shrink-0" />
                {outcome.headline}
              </p>
              <p className="text-dense text-muted-foreground">{outcome.detail}</p>
            </>
          ) : isError ? (
            <>
              <p className="text-sm font-medium">Couldn&apos;t check the record</p>
              <p className="text-dense text-muted-foreground">
                {getErrorMessage(error)}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Has this record been altered?</p>
              <p className="text-dense text-muted-foreground">
                Every event is hashed and chained to the one before it. This
                recomputes those hashes and reports any that no longer match.
              </p>
            </>
          )}
        </div>
        <LoadingButton
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={handleVerify}
          isPending={isFetching}
          loadingText="Checking…"
        >
          {data ? "Check again" : "Check integrity"}
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
