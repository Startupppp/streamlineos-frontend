"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useCan, useCanState } from "@/hooks/api/access";
import {
  useDocumentCompliance,
  useSubmitDocumentCompliance,
} from "@/hooks/api/accounting/documents";
import type { DocumentCompliance } from "@/hooks/api/accounting/documents-schema";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

type ComplianceStatus = DocumentCompliance["states"][number]["status"];

const STATUS_LABEL: Readonly<Record<ComplianceStatus, string>> = {
  not_required: "Not required",
  pending: "Not filed",
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_TONE: Readonly<Record<ComplianceStatus, StatusTone>> = {
  not_required: "neutral",
  pending: "warning",
  submitted: "info",
  accepted: "success",
  rejected: "danger",
  cancelled: "neutral",
};

const SUBMITTABLE: ReadonlySet<ComplianceStatus> = new Set(["pending", "rejected"]);

interface DocumentComplianceCardProps {
  documentType: "sales_invoice" | "credit_note";
  documentId: string;
}

export function DocumentComplianceCard({ documentType, documentId }: DocumentComplianceCardProps) {
  const readState = useCanState("accounting:receivables:read");
  const canSubmit = useCan("accounting:receivables:manage");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = useDocumentCompliance(documentType, documentId);
  const submit = useSubmitDocumentCompliance(documentType, documentId);

  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);
  const handleOpenConfirm = useCallback(() => setConfirmOpen(true), []);

  function handleSubmit(): void {
    submit.mutate(undefined, {
      onSuccess: (response) => {
        setConfirmOpen(false);
        if (response.result.outcome === "accepted")
          toast.success(response.headline ?? "The authority accepted this document");
        else if (response.result.outcome === "rejected")
          toast.error(response.headline ?? "The authority rejected this document");
        else toast.error(response.result.reason);
      },
      onError: (error) => {
        setConfirmOpen(false);
        toast.error(getErrorMessage(error));
      },
    });
  }

  if (readState === "denied") return null;
  if (query.data === null) return null;

  const data = query.data;
  const showSubmit =
    canSubmit &&
    data !== undefined &&
    data.transport.configured &&
    !data.filed &&
    data.states.some((state) => SUBMITTABLE.has(state.status));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>E-invoicing</CardTitle>
          <CardDescription>{data?.headline ?? "Checking whether this document must be reported."}</CardDescription>
        </div>
        {showSubmit ? (
          <LoadingButton
            type="button"
            size="sm"
            variant="outline"
            isPending={submit.isPending}
            onClick={handleOpenConfirm}
          >
            Submit to {data.transport.name}
          </LoadingButton>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {query.isError ? (
          <ErrorState compact error={query.error} onRetry={handleRetry} />
        ) : !data ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.states.map((state) => {
              const tone = statusToneClasses(STATUS_TONE[state.status]);
              return (
                <li key={state.transport} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium uppercase">{state.transport}</span>
                    <Badge
                      variant="outline"
                      className={cn("h-5 px-2 py-0.5 text-micro", tone.surface, tone.ink, tone.rule)}
                    >
                      {STATUS_LABEL[state.status]}
                    </Badge>
                  </div>
                  <p className="text-label text-muted-foreground">{state.headline}</p>
                  {state.ackNo ? (
                    <p className="font-mono text-label tabular-nums">Acknowledgement {state.ackNo}</p>
                  ) : null}
                  {state.errors?.map((authorityError) => (
                    <p key={authorityError.code} className="text-label text-destructive">
                      {authorityError.code}: {authorityError.message}
                    </p>
                  ))}
                  {state.action ? <p className="text-label">{state.action}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit this document for e-invoicing?"
        description={
          data?.transport.real === false
            ? `${data.transport.name} is a test connection: nothing reaches a tax authority and the document stays unfiled.`
            : "The posted figures are sent to the tax authority as they stand in the ledger."
        }
        confirmLabel="Submit"
        isPending={submit.isPending}
        keepOpenOnConfirm
        onConfirm={handleSubmit}
      />
    </Card>
  );
}
