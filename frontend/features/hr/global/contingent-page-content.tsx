"use client";

import React, { useState, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  useContracts,
  useEndContract,
  useConvertToEmployee,
  useInternshipCertificate,
  type HrContract,
} from "@/hooks/api/hr/global";
import { ContractSheet } from "./contract-sheet";

function ContractTypeBadge({ type }: { type: HrContract["contractType"] }) {
  const colors: Record<HrContract["contractType"], string> = {
    contractor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
    consultant: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
    intern: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    temporary: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    agency: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
    freelancer: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/30",
  };
  return <Badge className={`capitalize ${colors[type]}`}>{type}</Badge>;
}

function ContractStatusBadge({ status }: { status: HrContract["status"] }) {
  if (status === "expiring") return <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">Expiring</Badge>;
  if (status === "ended") return <Badge className="bg-muted text-muted-foreground border-border dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700">Ended</Badge>;
  if (status === "converted") return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30">Converted</Badge>;
  if (status === "renewed") return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">Renewed</Badge>;
  return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">Active</Badge>;
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
              dangerouslySetInnerHTML={{ __html: data.html }}
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

  const { data, isLoading } = useContracts();
  const endContract = useEndContract();
  const convert = useConvertToEmployee();

  const handleOpenEdit = useCallback((contract: HrContract) => {
    setEditingContract(contract);
    setSheetOpen(true);
  }, []);

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
      ) : (data?.data ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No contingent contracts yet.</p>
          <Button variant="link" size="sm" onClick={() => setSheetOpen(true)} className="mt-2">Add the first contract</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((contract) => (
            <div key={contract.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <ContractTypeBadge type={contract.contractType} />
                  {contract.agencyVendor && (
                    <span className="text-xs text-muted-foreground truncate">via {contract.agencyVendor}</span>
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
                  <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-700" onClick={() => setEndContractId(contract.id)}>
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
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (endContractId) {
                  endContract.mutate({ contractId: endContractId }, { onSuccess: () => setEndContractId(null) });
                }
              }}
            >
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
            <AlertDialogAction
              onClick={() => {
                if (convertContractId) {
                  convert.mutate({ contractId: convertContractId }, { onSuccess: () => setConvertContractId(null) });
                }
              }}
            >
              Convert to employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
