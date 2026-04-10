"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  useTerminations, useCreateTermination, useSubmitTermination,
  useCeoReviewTermination, useSendTerminationEmail, useCompleteTermination,
  useTerminationDetail, useTerminationLetter, type Termination,
} from "@/lib/api/hooks/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import {
  Plus, CheckCircle2, XCircle, Eye, Send, ChevronRight,
  AlertTriangle, Shield, FileText,
} from "lucide-react";
import { useSession } from "next-auth/react";

const TERMINATION_REASONS = [
  "Poor Performance",
  "Misconduct",
  "Insubordination",
  "Attendance Issues",
  "Policy Violation",
  "Redundancy / Restructuring",
  "End of Contract",
  "Probation Failure",
  "Fraud / Dishonesty",
  "Breach of NDA",
  "Health / Safety Violation",
  "Other",
] as const;

function statusBadge(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (status === "COMPLETED" || status === "SENT") return "default";
  if (status === "APPROVED") return "secondary";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

// ─── Termination Detail Panel ───
function TerminationDetailPanel({
  id, role,
}: {
  id: number; role: string | undefined;
}) {
  const { data: termination, isLoading } = useTerminationDetail(id);
  const { data: letterData } = useTerminationLetter(id);
  const submitForCeo = useSubmitTermination();
  const ceoReview = useCeoReviewTermination();
  const sendEmail = useSendTerminationEmail();
  const complete = useCompleteTermination();
  const [remarks, setRemarks] = useState("");
  const [showLetter, setShowLetter] = useState(false);

  if (isLoading || !termination) {
    return <div className="space-y-3 p-4"><Skeleton className="h-20" /><Skeleton className="h-40" /></div>;
  }

  const canSubmitForCeo = (role === "HR" || role === "CEO") && termination.status === "DRAFT";
  const canCeoReview = role === "CEO" && termination.status === "PENDING_CEO";
  const canSendEmail = (role === "HR" || role === "CEO") && termination.status === "APPROVED";
  const canComplete = (role === "HR" || role === "CEO") && termination.status === "SENT";

  return (
    <div className="space-y-4 p-1">
      {/* Employee Card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={resolveImageUrl(termination.user?.image ?? null)} />
            <AvatarFallback className="bg-red-500/10 text-red-500">{termination.user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{termination.user?.name}</p>
            <p className="text-xs text-muted-foreground">{termination.user?.designation}</p>
          </div>
          <Badge variant={statusBadge(termination.status)} className="ml-auto">{termination.status}</Badge>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <div className="flex items-center gap-2 overflow-x-auto py-2">
        {["DRAFT", "PENDING_CEO", "APPROVED", "SENT", "COMPLETED"].map((step, i, arr) => {
          const statusOrder = ["DRAFT", "PENDING_CEO", "APPROVED", "SENT", "COMPLETED"];
          const currentIdx = statusOrder.indexOf(termination.status ?? "DRAFT");
          const stepIdx = statusOrder.indexOf(step);
          const isComplete = stepIdx <= currentIdx;
          const isActive = stepIdx === currentIdx;
          const isRejected = termination.status === "REJECTED" && step === "PENDING_CEO";

          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center min-w-[70px]">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 ${
                  isRejected ? "bg-red-500 border-red-500 text-white" :
                  isComplete ? "bg-green-500 border-green-500 text-white" :
                  isActive ? "bg-blue-500 border-blue-500 text-white" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {isComplete ? <CheckCircle2 className="h-3 w-3" /> : isRejected ? <XCircle className="h-3 w-3" /> : i + 1}
                </div>
                <p className="text-[9px] mt-1 text-center">{step.replace("_", " ")}</p>
              </div>
              {i < arr.length - 1 && (
                <div className={`h-0.5 w-4 ${isComplete ? "bg-green-500" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Details */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Termination Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Effective Date:</span> <strong>{termination.effectiveDate ? format(new Date(termination.effectiveDate), "MMM d, yyyy") : "N/A"}</strong></div>
            <div><span className="text-muted-foreground">Notice Waived:</span> <strong>{termination.noticePeriodWaived ? "Yes" : "No"}</strong></div>
            {termination.severanceAmount && <div><span className="text-muted-foreground">Severance:</span> <strong>INR {termination.severanceAmount}</strong></div>}
          </div>
          <div>
            <span className="text-muted-foreground">Reasons:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {termination.reasons?.map((r) => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Explanation:</span>
            <p className="mt-1 p-2 rounded bg-muted text-xs">{termination.detailedExplanation}</p>
          </div>
          {termination.internalNotes && (
            <div>
              <span className="text-muted-foreground">Internal Notes:</span>
              <p className="mt-1 p-2 rounded bg-muted text-xs">{termination.internalNotes}</p>
            </div>
          )}
          {termination.ceoRemarks && (
            <div>
              <span className="text-muted-foreground">CEO Remarks:</span>
              <p className="mt-1 p-2 rounded bg-muted text-xs">{termination.ceoRemarks}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Letter Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Termination Letter
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowLetter(!showLetter)}>
              <Eye className="h-3 w-3 mr-1" />{showLetter ? "Hide" : "Preview"}
            </Button>
          </CardTitle>
        </CardHeader>
        {showLetter && letterData && (
          <CardContent>
            <div className="border rounded-lg p-4 bg-white text-black max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: letterData.html }} />
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        {canSubmitForCeo && (
          <Button
            className="w-full" size="sm"
            onClick={() => {
              submitForCeo.mutate(id, {
                onSuccess: () => toast.success("Submitted for CEO approval"),
                onError: (e) => toast.error(getErrorMessage(e)),
              });
            }}
            disabled={submitForCeo.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Submit for CEO Approval
          </Button>
        )}

        {canCeoReview && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Textarea placeholder="Remarks (required for rejection)..." value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => {
                  ceoReview.mutate({ id, action: "APPROVED", remarks: remarks.trim() || undefined }, {
                    onSuccess: () => { toast.success("Approved"); setRemarks(""); },
                    onError: (e) => toast.error(getErrorMessage(e)),
                  });
                }} disabled={ceoReview.isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  if (!remarks.trim()) { toast.error("Remarks required for rejection"); return; }
                  ceoReview.mutate({ id, action: "REJECTED", remarks: remarks.trim() }, {
                    onSuccess: () => { toast.success("Rejected"); setRemarks(""); },
                    onError: (e) => toast.error(getErrorMessage(e)),
                  });
                }} disabled={ceoReview.isPending}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {canSendEmail && (
          <Button
            className="w-full" size="sm" variant="destructive"
            onClick={() => {
              sendEmail.mutate(id, {
                onSuccess: () => toast.success("Termination letter sent to employee"),
                onError: (e) => toast.error(getErrorMessage(e)),
              });
            }}
            disabled={sendEmail.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Send Letter to Employee
          </Button>
        )}

        {canComplete && (
          <Button
            className="w-full" size="sm"
            onClick={() => {
              complete.mutate(id, {
                onSuccess: () => toast.success("Termination completed. Employee account deactivated."),
                onError: (e) => toast.error(getErrorMessage(e)),
              });
            }}
            disabled={complete.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark as Completed
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function TerminationPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "CEO" || role === "HR";

  const { data: terminations, isLoading } = useTerminations();
  const { data: employees } = useHrEmployees();
  const createTermination = useCreateTermination();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  // Form state
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [severanceAmount, setSeveranceAmount] = useState("");
  const [noticePeriodWaived, setNoticePeriodWaived] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");

  const resetForm = () => {
    setSelectedEmployee("");
    setSelectedReasons([]);
    setExplanation("");
    setEffectiveDate("");
    setSeveranceAmount("");
    setNoticePeriodWaived(false);
    setInternalNotes("");
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleCreate = useCallback(() => {
    if (!selectedEmployee) { toast.error("Select an employee"); return; }
    if (!selectedReasons.length) { toast.error("Select at least one reason"); return; }
    if (explanation.length < 100) { toast.error("Explanation must be at least 100 characters"); return; }
    if (!effectiveDate) { toast.error("Effective date is required"); return; }

    createTermination.mutate(
      {
        userId: selectedEmployee,
        reasons: selectedReasons,
        detailedExplanation: explanation,
        effectiveDate,
        severanceAmount: severanceAmount || undefined,
        noticePeriodWaived,
        internalNotes: internalNotes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Termination record created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [selectedEmployee, selectedReasons, explanation, effectiveDate, severanceAmount, noticePeriodWaived, internalNotes, createTermination]);

  if (!isAdmin) {
    return (
      <PageWrapper title="Termination Management" subtitle="Access restricted">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">You don&apos;t have permission to view this page.</p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Termination Management" subtitle="Manage employee terminations">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Termination Management"
      subtitle="Manage employee terminations and offboarding"
      badge={`${terminations?.length ?? 0} records`}
      actions={
        role === "HR" || role === "CEO" ? (
          <Button size="sm" variant="destructive" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />Initiate Termination
          </Button>
        ) : undefined
      }
    >
      {!terminations?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No termination records.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {terminations.map((t: Termination) => (
            <Card key={t.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDetailId(t.id)}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={resolveImageUrl(t.user?.image ?? null)} />
                  <AvatarFallback className="text-xs bg-red-500/10 text-red-500">{t.user?.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{t.user?.name ?? "Employee"}</p>
                    <Badge variant={statusBadge(t.status)} className="text-[10px]">{t.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                    {t.user?.designation && <span>{t.user.designation}</span>}
                    {t.effectiveDate && <span>Effective: {format(new Date(t.effectiveDate), "MMM d, yyyy")}</span>}
                    {t.reasons?.length && <span>{t.reasons.length} reason(s)</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Termination Sheet */}
      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Initiate Termination" onSubmit={handleCreate} submitLabel="Create Draft" isPending={createTermination.isPending}>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 flex items-start gap-2.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>This action will create a termination record. The employee will not be notified until the letter is sent after CEO approval.</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee *</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="">Search / select employee...</option>
            {(employees as { id: string; name: string | null; designation: string | null }[] | undefined)?.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name} — {emp.designation ?? "N/A"}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason(s) * <span className="text-muted-foreground font-normal">(multi-select)</span></label>
          <div className="grid grid-cols-2 gap-1.5">
            {TERMINATION_REASONS.map((reason) => (
              <label
                key={reason}
                className={`flex items-center gap-2 text-xs p-2 rounded-md border cursor-pointer transition-colors ${
                  selectedReasons.includes(reason) ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedReasons.includes(reason)}
                  onChange={() => toggleReason(reason)}
                  className="rounded"
                />
                {reason}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Detailed Explanation * <span className="text-muted-foreground font-normal">(min 100 chars)</span></label>
          <Textarea placeholder="Provide specific details supporting the termination..." value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={4} />
          <p className="text-[10px] text-muted-foreground">{explanation.length}/100 characters minimum</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Effective Date *</label>
          <input
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Severance Amount</label>
            <input
              type="number"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="0"
              value={severanceAmount}
              onChange={(e) => setSeveranceAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={noticePeriodWaived}
                onChange={(e) => setNoticePeriodWaived(e.target.checked)}
                className="rounded"
              />
              Notice Period Waived
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Internal Notes <span className="text-muted-foreground font-normal">(HR/CEO only)</span></label>
          <Textarea placeholder="Internal notes visible only to HR and CEO..." value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} />
        </div>
      </HrSheet>

      {/* Detail Sheet */}
      <HrSheet
        open={detailId !== null}
        onOpenChange={(open) => { if (!open) setDetailId(null); }}
        title="Termination Details"
        showSubmit={false}
      >
        {detailId && <TerminationDetailPanel id={detailId} role={role} />}
      </HrSheet>
    </PageWrapper>
  );
}
