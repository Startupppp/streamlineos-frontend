"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { SanitizedHtml } from "@/components/shared/sanitized-html";
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
  const { data, isLoading, isError, error } = useInternshipCertificate(contractId, enabled);

  function handleClick() {
    setEnabled(true);
  }

  if (enabled && isError) {
    toast.error(getErrorMessage(error));
    setEnabled(false);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={handleClick}
      >
        <FileText className="h-3 w-3" />
        Certificate
      </Button>
      {enabled && !isLoading && !isError && data && (
        <AlertDialog open onOpenChange={() => setEnabled(false)}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Internship Certificate</AlertDialogTitle>
            </AlertDialogHeader>
            <SanitizedHtml
              html={data.html}
              className="prose prose-sm max-h-96 overflow-y-auto rounded-lg border border-border p-4 bg-card"
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
  // The page is gated on hr:contracts:view; every mutation needs :manage.
  const canManage = useCan("hr:contracts:manage");
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

  const handleOpenNew = useCallback(() => {
    setEditingContract(undefined);
    setSheetOpen(true);
  }, []);
  const handleEndDialogChange = useCallback((open: boolean) => { if (!open) setEndContractId(null); }, []);
  const handleConvertDialogChange = useCallback((open: boolean) => { if (!open) setConvertContractId(null); }, []);

  const pageState = usePageState({
    permission: "hr:contracts:view",
    isLoading,
    isError,
    error,
    isEmpty: (data?.data ?? []).length === 0,
  });

  return (
    <PageWrapper
      title="Contingent Workforce"
      subtitle="Manage contractor, intern, temporary, and agency engagements."
      actions={
        canManage ? (
          <Button size="sm" onClick={handleOpenNew} className="gap-1.5">
            <PlusIcon size={14} />
            New contract
          </Button>
        ) : null
      }
    >
      <PageState
        resolution={pageState}
        loading={<div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>}
        onRetry={handleRetry}
        className="flex-1"
        empty={
          <EmptyState
            illustrationPreset="team"
            title="No contingent contracts yet"
            description="Track contractors, interns, temporary, and agency engagements."
            action={canManage ? { label: "Add the first contract", onClick: handleOpenNew } : undefined}
          />
        }
      >
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
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(contract)}>Edit</Button>
                )}
                {contract.contractType === "intern" && contract.status !== "ended" && (
                  <CertificateViewer contractId={contract.id} />
                )}
                {canManage && contract.status === "active" && (
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => setConvertContractId(contract.id)}>
                    Convert
                  </Button>
                )}
                {canManage && contract.status === "active" && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setEndContractId(contract.id)}>
                    End
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </PageState>

      <ContractSheet
        open={sheetOpen}
        onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditingContract(undefined); }}
        existing={editingContract}
      />

      <ConfirmDialog
        open={endContractId !== null}
        onOpenChange={handleEndDialogChange}
        title="End contract?"
        description="This will mark the contract as ended. Access revocation and offboarding events will be triggered."
        confirmLabel="End contract"
        destructive
        isPending={endContract.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmEndContract}
      />

      <ConfirmDialog
        open={convertContractId !== null}
        onOpenChange={handleConvertDialogChange}
        title="Convert to full-time employee?"
        description="This will update the employment record worker type to FULL_TIME and mark the contract as converted. No duplicate record will be created — the existing employment is updated in place."
        confirmLabel="Convert to employee"
        isPending={convert.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmConvertContract}
      />
    </PageWrapper>
  );
}
