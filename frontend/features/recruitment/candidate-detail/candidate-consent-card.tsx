"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useCandidate, useEraseCandidate } from "@/hooks/api/hr/recruitment/candidates";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";

const PURPOSE_LABEL: Record<string, string> = {
  THIS_ROLE_ONLY: "This role only",
  FUTURE_ROLES: "Future openings",
  BACKGROUND_VERIFICATION: "Background checks",
  STATUTORY_RECORD: "Statutory employment record",
};

interface CandidateConsentCardProps {
  candidateId: number;
}

export function CandidateConsentCard({ candidateId }: CandidateConsentCardProps) {
  const router = useRouter();
  const canManage = useCan("hr:requisitions:manage");
  const { data, isLoading, isError } = useCandidate(candidateId);
  const erase = useEraseCandidate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmErase = useCallback(() => {
    erase.mutate(candidateId, {
      onSuccess: (result) => {
        if (result.status === "ERASED") {
          toast.success("Candidate erased, résumé vault confirmed clear");
          setConfirmOpen(false);
          router.push("/recruitment/candidates");
          return;
        }
        toast.warning("Records deleted — résumé vault NOT confirmed", {
          description: result.summary,
          duration: 12_000,
        });
        setConfirmOpen(false);
        router.push("/recruitment/candidates");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [candidateId, erase, router]);

  const handleOpenConfirm = useCallback(() => setConfirmOpen(true), []);

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;

  if (isError || !data) return null;

  const applications = data.applications ?? [];
  const withConsent = applications.filter((application) => application.consentPurpose);

  return (
    <div className="rounded-xl border px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Consent and retention</h3>
        {withConsent.length === 0 && (
          <Badge variant="outline" className="text-micro">
            No purpose recorded
          </Badge>
        )}
      </div>

      {withConsent.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          This candidate&apos;s applications predate recorded consent purposes, so no retention
          period can be calculated. They will not be erased automatically.
        </p>
      ) : (
        <dl className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
          {withConsent.map((application) => (
            <div key={application.id} className="flex flex-col gap-0.5 sm:col-span-2">
              <div className="flex flex-wrap gap-1.5">
                <dt>Purpose</dt>
                <dd className="text-foreground">
                  {application.consentPurpose
                    ? (PURPOSE_LABEL[application.consentPurpose] ??
                      `Unrecognised (${application.consentPurpose})`)
                    : "Not recorded"}
                </dd>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <dt>Kept until</dt>
                <dd className="text-foreground">
                  {application.retainUntil ? formatShortDate(application.retainUntil) : "Not set"}
                </dd>
              </div>
              {application.consentAt && (
                <div className="flex flex-wrap gap-1.5">
                  <dt>Consent given</dt>
                  <dd className="text-foreground">{formatShortDate(application.consentAt)}</dd>
                </div>
              )}
            </div>
          ))}
        </dl>
      )}

      
      {canManage && (
        <div className="pt-1">
          <LoadingButton
            type="button"
            variant="destructive"
            size="sm"
            isPending={erase.isPending}
            loadingText="Erasing…"
            onClick={handleOpenConfirm}
          >
            Erase personal data
          </LoadingButton>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Erase ${data.firstName} ${data.lastName}?`}
        description="This deletes the candidate, their applications, interviews and every document in the résumé vault. It cannot be undone. Stored files are deleted from the object store as well — if any cannot be confirmed deleted, you will be told exactly which."
        confirmLabel="Erase personal data"
        destructive
        keepOpenOnConfirm
        isPending={erase.isPending}
        onConfirm={handleConfirmErase}
      />
    </div>
  );
}
