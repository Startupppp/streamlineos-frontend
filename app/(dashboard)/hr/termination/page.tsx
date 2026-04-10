"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  CheckCircle2,
  XCircle,
  Mail,
  AlertTriangle,
  Calendar,
  User,
  BadgeDollarSign,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

import {
  useTerminations,
  useCreateTermination,
  useSubmitTermination,
  useCompleteTermination,
  useCeoReviewTermination,
  useSendTerminationEmail,
  useHrEmployees,
  type Termination,
  type TerminationStatus,
} from "@/lib/api/hooks/hr";
import type { Employee } from "@/types/hr";

import { getErrorMessage } from "@/lib/get-error-message";

// ─── Constants ────────────────────────────────────────────────────────────────

const TERMINATION_REASONS = [
  "Poor Performance",
  "Misconduct",
  "Insubordination",
  "Attendance Issues",
  "Policy Violation",
  "Redundancy/Restructuring",
  "End of Contract",
  "Probation Failure",
  "Fraud/Dishonesty",
  "Breach of NDA",
  "Health/Safety Violation",
  "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(
  status: TerminationStatus | null
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "DRAFT":
      return "outline";
    case "PENDING_CEO":
      return "secondary";
    case "APPROVED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "SENT":
      return "secondary";
    case "COMPLETED":
      return "default";
    default:
      return "outline";
  }
}

function statusLabel(status: TerminationStatus | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING_CEO":
      return "Pending CEO";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "SENT":
      return "Email Sent";
    case "COMPLETED":
      return "Completed";
    default:
      return status ?? "Unknown";
  }
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function buildLetterPreview(params: {
  employeeName: string;
  designation: string;
  effectiveDate: string;
  reasons: string[];
  explanation: string;
  noticePeriodWaived: boolean;
  severanceAmount: string;
}): string {
  const {
    employeeName,
    designation,
    effectiveDate,
    reasons,
    explanation,
    noticePeriodWaived,
    severanceAmount,
  } = params;

  const dateStr = effectiveDate
    ? format(new Date(effectiveDate), "MMMM d, yyyy")
    : "[Date not set]";
  const reasonList =
    reasons.length > 0 ? reasons.join(", ") : "[No reasons selected]";
  const severanceLine =
    severanceAmount && Number(severanceAmount) > 0
      ? `\nSeverance Amount: ₹${Number(severanceAmount).toLocaleString("en-IN")}`
      : "";
  const noticeLine = noticePeriodWaived
    ? "\nNote: Notice period has been waived."
    : "";

  return `TERMINATION LETTER

Dear ${employeeName || "[Employee Name]"},

This letter serves as formal notice of the termination of your employment as ${designation || "[Designation]"} with our organization, effective ${dateStr}.

Reason(s) for Termination:
${reasonList}

Details:
${explanation || "[Explanation not provided]"}
${severanceLine}${noticeLine}

Please ensure all company property, access credentials, and pending deliverables are handed over before your last working day.

Regards,
Human Resources Department`;
}

// ─── Termination Card ─────────────────────────────────────────────────────────

interface TerminationCardProps {
  record: Termination;
  isHR: boolean;
  isCEO: boolean;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSendEmail: (record: Termination) => void;
  isSubmitting: boolean;
}

function TerminationCard({
  record,
  isHR,
  isCEO,
  onSubmit,
  onApprove,
  onReject,
  onSendEmail,
  isSubmitting,
}: TerminationCardProps) {
  const { employee, status, reasons, effectiveDate, severanceAmount, noticePeriodWaived } =
    record;

  const visibleReasons = reasons.slice(0, 2);
  const extraCount = reasons.length - 2;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Top row: name + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{employee.name ?? "Employee"}</p>
              <Badge variant={statusVariant(status)} className="text-[10px] shrink-0">
                {statusLabel(status)}
              </Badge>
            </div>

            {/* Second row: designation + employeeId */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
              {employee.designation && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {employee.designation}
                </span>
              )}
              {employee.employeeId && <span>ID: {employee.employeeId}</span>}
              {effectiveDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Effective: {format(new Date(effectiveDate), "MMM d, yyyy")}
                </span>
              )}
              {severanceAmount && Number(severanceAmount) > 0 && (
                <span className="flex items-center gap-1">
                  <BadgeDollarSign className="h-3 w-3" />
                  ₹{Number(severanceAmount).toLocaleString("en-IN")}
                </span>
              )}
              {noticePeriodWaived && (
                <span className="text-amber-600 dark:text-amber-400">Notice waived</span>
              )}
            </div>

            {/* Reasons row */}
            {reasons.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {visibleReasons.map((r) => (
                  <Badge key={r} variant="outline" className="text-[9px] py-0 h-4">
                    {r}
                  </Badge>
                ))}
                {extraCount > 0 && (
                  <Badge variant="outline" className="text-[9px] py-0 h-4">
                    +{extraCount} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {/* HR: submit DRAFT for CEO approval */}
            {isHR && status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Submit termination for ${employee.name} for CEO approval`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Submit for Approval
              </Button>
            )}

            {/* CEO: approve or reject PENDING_CEO */}
            {isCEO && status === "PENDING_CEO" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onApprove(record.id)}
                  aria-label={`Approve termination for ${employee.name}`}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => onReject(record.id)}
                  aria-label={`Reject termination for ${employee.name}`}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {/* HR: send email after APPROVED */}
            {isHR && status === "APPROVED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSendEmail(record)}
                aria-label={`Send termination email to ${employee.name}`}
              >
                <Mail className="h-3 w-3 mr-1" />
                Send Termination Email
              </Button>
            )}

            {/* Read-only labels for terminal states */}
            {(status === "SENT" || status === "COMPLETED") && (
              <span className="text-[11px] text-muted-foreground italic">
                {status === "SENT" ? "Email sent" : "Completed"}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TerminationPage() {
  const { data: session } = useSession();

  const role = session?.user?.role;
  const isHR = role === "HR";
  const isCEO = role === "CEO";

  const { data: terminations, isLoading } = useTerminations();
  const { data: employeesData } = useHrEmployees({ limit: 500 });
  const createTermination = useCreateTermination();
  const submitTermination = useSubmitTermination();
  const ceoReview = useCeoReviewTermination();
  const sendEmail = useSendTerminationEmail();

  // ── Create sheet state ────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [noticePeriodWaived, setNoticePeriodWaived] = useState(false);
  const [severanceAmount, setSeveranceAmount] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // ── Submit confirm ────────────────────────────────────────────────────────
  const [submitId, setSubmitId] = useState<number | null>(null);

  // ── CEO review sheet ──────────────────────────────────────────────────────
  const [reviewRecord, setReviewRecord] = useState<Termination | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | null>(null);
  const [ceoRemarks, setCeoRemarks] = useState("");
  const [ceoSheetOpen, setCeoSheetOpen] = useState(false);

  // ── Send email confirm ────────────────────────────────────────────────────
  const [emailRecord, setEmailRecord] = useState<Termination | null>(null);

  // ── Employees list ────────────────────────────────────────────────────────
  const employees = useMemo<Employee[]>(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData as Employee[];
    // PaginatedEmployees
    const paged = employeesData as { items?: Employee[]; data?: Employee[] };
    return paged.items ?? paged.data ?? [];
  }, [employeesData]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedUserId) ?? null,
    [employees, selectedUserId]
  );

  // ── Letter preview ────────────────────────────────────────────────────────
  const letterPreview = useMemo(
    () =>
      buildLetterPreview({
        employeeName: selectedEmployee?.name ?? "",
        designation: selectedEmployee?.designation ?? "",
        effectiveDate,
        reasons: selectedReasons,
        explanation,
        noticePeriodWaived,
        severanceAmount,
      }),
    [selectedEmployee, effectiveDate, selectedReasons, explanation, noticePeriodWaived, severanceAmount]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const resetCreateForm = useCallback(() => {
    setSelectedUserId("");
    setSelectedReasons([]);
    setExplanation("");
    setEffectiveDate("");
    setNoticePeriodWaived(false);
    setSeveranceAmount("");
    setInternalNotes("");
  }, []);

  const handleToggleReason = useCallback((reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  }, []);

  const handleCreateSubmit = useCallback(() => {
    if (!selectedUserId) {
      toast.error("Please select an employee");
      return;
    }
    if (selectedReasons.length === 0) {
      toast.error("Please select at least one termination reason");
      return;
    }
    if (explanation.trim().length < 50) {
      toast.error("Detailed explanation must be at least 50 characters");
      return;
    }
    if (!effectiveDate) {
      toast.error("Please set an effective date");
      return;
    }

    createTermination.mutate(
      {
        userId: selectedUserId,
        reasons: selectedReasons,
        detailedExplanation: explanation.trim(),
        effectiveDate,
        severanceAmount: severanceAmount ? Number(severanceAmount) : undefined,
        noticePeriodWaived,
        internalNotes: internalNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Termination saved as draft");
          setCreateOpen(false);
          resetCreateForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    selectedUserId,
    selectedReasons,
    explanation,
    effectiveDate,
    severanceAmount,
    noticePeriodWaived,
    internalNotes,
    createTermination,
    resetCreateForm,
  ]);

  const handleSubmitForApproval = useCallback(() => {
    if (!submitId) return;
    submitTermination.mutate(submitId, {
      onSuccess: () => {
        toast.success("Submitted for CEO approval");
        setSubmitId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [submitId, submitTermination]);

  const handleOpenCeoReview = useCallback(
    (record: Termination, decision: "approve" | "reject") => {
      setReviewRecord(record);
      setReviewDecision(decision);
      setCeoRemarks("");
      setCeoSheetOpen(true);
    },
    []
  );

  const handleCeoReviewSubmit = useCallback(() => {
    if (!reviewRecord || !reviewDecision) return;
    ceoReview.mutate(
      {
        id: reviewRecord.id,
        decision: reviewDecision,
        remarks: ceoRemarks.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            reviewDecision === "approve"
              ? "Termination approved"
              : "Termination rejected"
          );
          setCeoSheetOpen(false);
          setReviewRecord(null);
          setReviewDecision(null);
          setCeoRemarks("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [reviewRecord, reviewDecision, ceoRemarks, ceoReview]);

  const handleSendEmailOpen = useCallback((record: Termination) => {
    setEmailRecord(record);
  }, []);

  const handleSendEmailConfirm = useCallback(() => {
    if (!emailRecord) return;
    sendEmail.mutate(emailRecord.id, {
      onSuccess: () => {
        toast.success("Termination email sent");
        setEmailRecord(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [emailRecord, sendEmail]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageWrapper
        title="Termination Management"
        subtitle="Manage employee terminations"
      >
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  const list = terminations ?? [];

  return (
    <PageWrapper
      title="Termination Management"
      subtitle="Manage employee terminations"
      badge={`${list.length} records`}
      actions={
        isHR ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Termination
          </Button>
        ) : undefined
      }
    >
      {/* ── Records list ──────────────────────────────────────────────────── */}
      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No termination records found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((record: Termination) => (
            <TerminationCard
              key={record.id}
              record={record}
              isHR={isHR}
              isCEO={isCEO}
              onSubmit={(id) => setSubmitId(id)}
              onApprove={(id) => {
                const r = list.find((t) => t.id === id);
                if (r) handleOpenCeoReview(r, "approve");
              }}
              onReject={(id) => {
                const r = list.find((t) => t.id === id);
                if (r) handleOpenCeoReview(r, "reject");
              }}
              onSendEmail={handleSendEmailOpen}
              isSubmitting={submitTermination.isPending}
            />
          ))}
        </div>
      )}

      {/* ── Create Sheet (HR) ──────────────────────────────────────────────── */}
      <HrSheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
        title="New Termination"
        description="Create a termination record. It will be saved as a draft."
        onSubmit={handleCreateSubmit}
        submitLabel="Save as Draft"
        isPending={createTermination.isPending}
      >
        {/* Employee select */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Employee <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger aria-label="Select employee">
              <SelectValue placeholder="Select an employee..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  <span className="flex flex-col">
                    <span>{emp.name ?? "Unnamed"}</span>
                    {emp.designation && (
                      <span className="text-xs text-muted-foreground">{emp.designation}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Termination Reasons */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Termination Reasons <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {TERMINATION_REASONS.map((reason) => (
              <div key={reason} className="flex items-center gap-2">
                <Checkbox
                  id={`reason-${reason}`}
                  checked={selectedReasons.includes(reason)}
                  onCheckedChange={() => handleToggleReason(reason)}
                  aria-label={reason}
                />
                <Label
                  htmlFor={`reason-${reason}`}
                  className="text-xs font-normal cursor-pointer"
                >
                  {reason}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Detailed explanation */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Detailed Explanation <span className="text-destructive">*</span>
          </Label>
          <Textarea
            placeholder="Minimum 50 characters. Describe the reasons and circumstances in detail..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={4}
            aria-label="Detailed explanation"
          />
          <p className="text-[11px] text-muted-foreground">
            {explanation.length} / 50 min characters
          </p>
        </div>

        {/* Effective date */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Effective Date <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            aria-label="Effective date"
          />
        </div>

        <Separator />

        {/* Notice period waived */}
        <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Notice Period Waived</p>
            <p className="text-xs text-muted-foreground">
              Employee will not be required to serve notice period.
            </p>
          </div>
          <Switch
            checked={noticePeriodWaived}
            onCheckedChange={setNoticePeriodWaived}
            aria-label="Notice period waived"
          />
        </div>

        {/* Severance amount */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Severance Amount{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₹
            </span>
            <Input
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              value={severanceAmount}
              onChange={(e) => setSeveranceAmount(e.target.value)}
              className="pl-6"
              aria-label="Severance amount"
            />
          </div>
        </div>

        {/* Internal notes */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Internal Notes{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            placeholder="Notes visible only to HR and management..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            aria-label="Internal notes"
          />
        </div>

        <Separator />

        {/* Letter preview */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Letter Preview</Label>
          <Textarea
            readOnly
            value={letterPreview}
            rows={12}
            className="font-mono text-[11px] bg-muted/40 resize-none"
            aria-label="Termination letter preview"
          />
          <p className="text-[11px] text-muted-foreground">
            Auto-generated preview based on the fields above. The final letter will be
            generated upon email send.
          </p>
        </div>
      </HrSheet>

      {/* ── Submit for Approval Confirm ────────────────────────────────────── */}
      <ConfirmActionDialog
        open={submitId !== null}
        onOpenChange={(open) => {
          if (!open) setSubmitId(null);
        }}
        title="Submit for CEO Approval"
        description="Are you sure you want to submit this termination record for CEO approval? The record will move to PENDING_CEO status."
        confirmLabel="Submit"
        variant="default"
        onConfirm={handleSubmitForApproval}
        isPending={submitTermination.isPending}
      />

      {/* ── CEO Review Sheet ───────────────────────────────────────────────── */}
      <HrSheet
        open={ceoSheetOpen}
        onOpenChange={(open) => {
          setCeoSheetOpen(open);
          if (!open) {
            setReviewRecord(null);
            setReviewDecision(null);
            setCeoRemarks("");
          }
        }}
        title={
          reviewDecision === "approve"
            ? "Approve Termination"
            : "Reject Termination"
        }
        description="Review the termination details before making a decision."
        onSubmit={handleCeoReviewSubmit}
        submitLabel={
          reviewDecision === "approve" ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-destructive-foreground">
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </span>
          )
        }
        isPending={ceoReview.isPending}
      >
        {reviewRecord && (
          <>
            {/* Employee info */}
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(reviewRecord.employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {reviewRecord.employee.name ?? "Employee"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reviewRecord.employee.designation ?? "—"}
                  {reviewRecord.employee.employeeId
                    ? ` · ID: ${reviewRecord.employee.employeeId}`
                    : ""}
                </p>
              </div>
            </div>

            {/* Effective date */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Effective Date
              </Label>
              <p className="text-sm">
                {reviewRecord.effectiveDate
                  ? format(new Date(reviewRecord.effectiveDate), "MMMM d, yyyy")
                  : "—"}
              </p>
            </div>

            {/* Reasons */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Reasons
              </Label>
              <div className="flex flex-wrap gap-1">
                {reviewRecord.reasons.map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Detailed Explanation
              </Label>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {reviewRecord.detailedExplanation}
              </p>
            </div>

            {/* Severance / notice */}
            {(reviewRecord.severanceAmount || reviewRecord.noticePeriodWaived) && (
              <div className="flex items-center gap-4 text-sm">
                {reviewRecord.severanceAmount &&
                  Number(reviewRecord.severanceAmount) > 0 && (
                    <span>
                      Severance:{" "}
                      <strong>
                        ₹
                        {Number(reviewRecord.severanceAmount).toLocaleString("en-IN")}
                      </strong>
                    </span>
                  )}
                {reviewRecord.noticePeriodWaived && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Notice period waived
                  </span>
                )}
              </div>
            )}

            <Separator />

            {/* CEO Remarks */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                CEO Remarks{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="Add any remarks or comments..."
                value={ceoRemarks}
                onChange={(e) => setCeoRemarks(e.target.value)}
                rows={3}
                aria-label="CEO remarks"
              />
            </div>
          </>
        )}
      </HrSheet>

      {/* ── Send Email Confirm ─────────────────────────────────────────────── */}
      <ConfirmActionDialog
        open={emailRecord !== null}
        onOpenChange={(open) => {
          if (!open) setEmailRecord(null);
        }}
        title="Send Termination Email"
        description={`Send termination email to ${emailRecord?.employee.name ?? "this employee"}? This will deactivate their account and notify them officially.`}
        confirmLabel="Send Email"
        variant="default"
        onConfirm={handleSendEmailConfirm}
        isPending={sendEmail.isPending}
      />
    </PageWrapper>
  );
}
