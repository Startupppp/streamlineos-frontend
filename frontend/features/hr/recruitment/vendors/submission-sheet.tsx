"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTodayString } from "@/lib/date-utils";
import { Plus } from "lucide-react";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import {
  useVendorSubmissions,
  useCreateVendorSubmission,
  useUpdateVendorSubmission,
  type RecruitmentVendor,
  type VendorSubmission,
} from "@/hooks/api";
import { useCandidates } from "@/hooks/api/hr/recruitment/candidates";
import { useJobPostings } from "@/hooks/api/hr/recruitment/jobs";

interface SubmissionSheetProps {
  vendor: RecruitmentVendor;
  onClose: () => void;
}

function StatusBadge({ status }: { status: VendorSubmission["placementStatus"] }) {
  const map: Record<string, string> = {
    SUBMITTED: "bg-blue-100 text-blue-700",
    INTERVIEWING: "bg-yellow-100 text-yellow-700",
    PLACED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${map[status] ?? ""}`}>{status}</span>;
}

function InvoiceBadge({ status }: { status: VendorSubmission["invoiceStatus"] }) {
  const map: Record<string, string> = {
    NOT_INVOICED: "bg-muted text-muted-foreground",
    INVOICED: "bg-orange-100 text-orange-700",
    PAID: "bg-green-100 text-green-700",
  };
  const label: Record<string, string> = { NOT_INVOICED: "Not Invoiced", INVOICED: "Invoiced", PAID: "Paid" };
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${map[status] ?? ""}`}>{label[status]}</span>;
}

function AddSubmissionForm({ vendorId, onDone }: { vendorId: number; onDone: () => void }) {
  const { data: candidates } = useCandidates();
  const { data: jobs } = useJobPostings({ status: "OPEN" });
  const createSubmission = useCreateVendorSubmission(vendorId);

  const [candidateId, setCandidateId] = useState("");
  const [jobPostingId, setJobPostingId] = useState("");
  const [billRate, setBillRate] = useState("");
  const [payRate, setPayRate] = useState("");

  const handleBillRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setBillRate(e.target.value), []);
  const handlePayRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPayRate(e.target.value), []);

  const handleSubmit = useCallback(() => {
    if (!candidateId) {
      toast.error("Select a candidate");
      return;
    }
    createSubmission.mutate(
      {
        candidateId: Number(candidateId),
        jobPostingId: jobPostingId ? Number(jobPostingId) : undefined,
        billRate: billRate ? Number(billRate) : undefined,
        payRate: payRate ? Number(payRate) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Candidate submitted");
          onDone();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [candidateId, jobPostingId, billRate, payRate, createSubmission, onDone]);

  return (
    <div className="border rounded-lg p-3 space-y-2.5 bg-muted/30">
      <p className="text-xs font-semibold text-foreground/80">Submit a Candidate</p>
      <Select value={candidateId} onValueChange={setCandidateId}>
        <SelectTrigger><SelectValue placeholder="Select a candidate" /></SelectTrigger>
        <SelectContent>
          {candidates?.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName} — {c.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={jobPostingId} onValueChange={setJobPostingId}>
        <SelectTrigger><SelectValue placeholder="Role (optional)" /></SelectTrigger>
        <SelectContent>
          {jobs?.map((j) => (
            <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Bill Rate</Label>
          <Input type="number" min={0} value={billRate} onChange={handleBillRateChange} placeholder="e.g. 120" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pay Rate</Label>
          <Input type="number" min={0} value={payRate} onChange={handlePayRateChange} placeholder="e.g. 90" />
        </div>
      </div>
      <Button size="sm" className="w-full h-8" onClick={handleSubmit} disabled={createSubmission.isPending}>
        {createSubmission.isPending ? "Submitting…" : "Submit Candidate"}
      </Button>
    </div>
  );
}

export function SubmissionSheet({ vendor, onClose }: SubmissionSheetProps) {
  const { data: submissions = [], isLoading } = useVendorSubmissions(vendor.id);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const updateSubmission = useUpdateVendorSubmission(vendor.id);

  const handleMarkPaid = useCallback((sub: VendorSubmission) => {
    setUpdatingId(sub.id);
    updateSubmission.mutate(
      { submissionId: sub.id, invoiceStatus: "PAID", paidAt: getTodayString() },
      {
        onSuccess: () => { toast.success("Marked as paid"); setUpdatingId(null); },
        onError: (e) => { toast.error(getErrorMessage(e)); setUpdatingId(null); },
      },
    );
  }, [updateSubmission]);

  const handleOpenChange = useCallback((v: boolean) => { if (!v) onClose(); }, [onClose]);
  const handleToggleAddForm = useCallback(() => setShowAddForm((v) => !v), []);
  const handleAddDone = useCallback(() => setShowAddForm(false), []);

  const canViewFinancials = submissions.some((s) => s.billRate !== null || s.payRate !== null) || showAddForm;

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{vendor.name} — Submissions</SheetTitle>
              <SheetDescription>Candidates submitted by this vendor and invoice status</SheetDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={handleToggleAddForm}>
              <Plus className="h-3.5 w-3.5" />
              Submit
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {showAddForm && <AddSubmissionForm vendorId={vendor.id} onDone={handleAddDone} />}
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
          ) : submissions.length === 0 ? (
            <RecruitmentEmptyState
              illustrationPreset="person"
              title="No submissions yet"
              className="border-0 bg-transparent shadow-none"
              compact
            />
          ) : (
            submissions.map((sub) => {
              const candidateName =
                [sub.candidateFirstName, sub.candidateLastName].filter(Boolean).join(" ") ||
                sub.candidateEmail ||
                `Candidate #${sub.candidateId}`;
              return (
                <div key={sub.id} className="border rounded-lg p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{candidateName}</p>
                      {sub.jobTitle && <p className="text-xs text-muted-foreground">{sub.jobTitle}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={sub.placementStatus} />
                      <InvoiceBadge status={sub.invoiceStatus} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Submitted {format(new Date(sub.submittedAt), "MMM d, yyyy")}</span>
                    {sub.invoiceAmount && <span className="font-medium">${parseFloat(sub.invoiceAmount).toLocaleString()}</span>}
                  </div>
                  {canViewFinancials && (sub.billRate || sub.payRate) && (
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t">
                      {sub.billRate && <span>Bill: ${parseFloat(sub.billRate).toLocaleString()}/hr</span>}
                      {sub.payRate && <span>Pay: ${parseFloat(sub.payRate).toLocaleString()}/hr</span>}
                      {sub.margin && <span className="font-medium text-foreground">Margin: ${parseFloat(sub.margin).toLocaleString()}/hr</span>}
                    </div>
                  )}
                  {sub.placementStatus === "PLACED" && sub.invoiceStatus !== "PAID" && (
                    <Button size="sm" variant="outline" className="text-xs h-7" disabled={updatingId === sub.id} onClick={() => handleMarkPaid(sub)}>
                      Mark Invoice Paid
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
