"use client";

import { useState, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  useContracts,
  useEndContract,
  useConvertToEmployee,
  useInternshipCertificate,
  type HrContract,
} from "@/hooks/api/hr/global";
import { ContractSheet } from "./contract-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";

function ContractTypeBadge({ type }: { type: HrContract["contractType"] }) {
  const colors: Record<HrContract["contractType"], string> = {
    contractor: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    consultant: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    intern: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    temporary: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    agency: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    freelancer: "bg-category-pink-surface text-category-pink-ink border-category-pink-rule",
  };
  return <Badge className={`capitalize ${colors[type]}`}>{type}</Badge>;
}

function ContractStatusBadge({ status }: { status: HrContract["status"] }) {
  if (status === "expiring") return <Badge className="bg-status-warning-surface text-status-warning-ink border-status-warning-rule">Expiring</Badge>;
  if (status === "ended") return <Badge className="bg-muted text-muted-foreground border-border">Ended</Badge>;
  if (status === "converted") return <Badge className="bg-status-info-surface text-status-info-ink border-status-info-rule">Converted</Badge>;
  if (status === "renewed") return <Badge className="bg-status-success-surface text-status-success-ink border-status-success-rule">Renewed</Badge>;
  return <Badge className="bg-status-success-surface text-status-success-ink border-status-success-rule">Active</Badge>;
}

function CertificateViewer({ contractId }: { contractId: number }) {
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading } = useInternshipCertificate(contractId, enabled);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs gap-1"
        onClick={() => setEnabled(true)}
      >
        <FileText className="h-3 w-3" />
        Certificate
      </Button>
      {enabled && !isLoading && data && (
        <AlertDialog open onOpenChange={() => setEnabled(false)}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Internship Certificate</AlertDialogTitle>
            </AlertDialogHeader>
            <div
              className="prose prose-sm max-h-96 overflow-y-auto rounded-lg border border-border p-4 bg-card"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.html) }}
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEnabled(false)}>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

export function ContingentPageContent() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<HrContract | undefined>(undefined);
  const [endContractId, setEndContractId] = useState<number | null>(null);
  const [convertContractId, setConvertContractId] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch } = useContracts();
  const endContract = useEndContract();
  const convert = useConvertToEmployee();

  function handleConfirmEndContract() {
    if (!endContractId) return;
    endContract.mutate({ contractId: endContractId }, { onSuccess: handleEndContractDone });
  }

  function handleEndContractDone() {
    setEndContractId(null);
  }

  function handleConfirmConvertContract() {
    if (!convertContractId) return;
    convert.mutate({ contractId: convertContractId }, { onSuccess: handleConvertContractDone });
  }

  function handleConvertContractDone() {
    setConvertContractId(null);
  }

  const handleOpenEdit = useCallback((contract: HrContract) => {
    setEditingContract(contract);
    setSheetOpen(true);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Contingent Workforce"
      subtitle="Manage contractor, intern, temporary, and agency engagements."
      actions={
        <Button size="sm" onClick={() => { setEditingContract(undefined); setSheetOpen(true); }} className="gap-1.5 h-8">
          <PlusIcon size={14} />
          New contract
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load contracts"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (data?.data ?? []).length === 0 ? (
        <EmptyState
          illustrationPreset="team"
          title="No contingent contracts yet"
          description="Track contractors, interns, temporary, and agency engagements."
          action={{
            label: "Add the first contract",
            onClick: () => setSheetOpen(true),
          }}
        />
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((contract) => (
            <div key={contract.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <ContractTypeBadge type={contract.contractType} />
                  {contract.agencyVendor && (
                    <TruncatedText text={`via ${contract.agencyVendor}`} className="text-xs text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {contract.startDate && format(new Date(contract.startDate), "d MMM yyyy")}
                  {contract.endDate && ` → ${format(new Date(contract.endDate), "d MMM yyyy")}`}
                  {contract.stipendCents && ` · Stipend: ${(contract.stipendCents / 100).toLocaleString()}`}
                </p>
              </div>
              <ContractStatusBadge status={contract.status} />
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleOpenEdit(contract)}>Edit</Button>
                {contract.contractType === "intern" && contract.status !== "ended" && (
                  <CertificateViewer contractId={contract.id} />
                )}
                {["contractor", "consultant", "intern", "temporary", "agency", "freelancer"].includes(contract.contractType) &&
                  contract.status === "active" && (
                    <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80" onClick={() => setConvertContractId(contract.id)}>
                      Convert
                    </Button>
                  )}
                {contract.status === "active" && (
                  <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => setEndContractId(contract.id)}>
                    End
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ContractSheet
        open={sheetOpen}
        onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditingContract(undefined); }}
        existing={editingContract}
      />

      <AlertDialog open={endContractId !== null} onOpenChange={(v) => { if (!v) setEndContractId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the contract as ended. Access revocation and offboarding events will be triggered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmEndContract}>
              End contract
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={convertContractId !== null} onOpenChange={(v) => { if (!v) setConvertContractId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to full-time employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the employment record worker type to FULL_TIME and mark the contract as converted.
              No duplicate record will be created — the existing employment is updated in place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConvertContract}>
              Convert to employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
