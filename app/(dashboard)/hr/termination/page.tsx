"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useAbility } from "@/lib/abilities-context";
import { format, isToday, isFuture, parseISO } from "date-fns";
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
  Check,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  TERMINATION_REASONS,
  TERMINATION_REASON_OTHER,
  TERMINATION_STATUSES,
  TERMINATION_STATUS_LABELS,
} from "@/lib/constants/hr-separation";


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
  if (status && status in TERMINATION_STATUS_LABELS) {
    return TERMINATION_STATUS_LABELS[status as keyof typeof TERMINATION_STATUS_LABELS];
  }
  return status ?? "Unknown";
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
  reason: string;
  remarks: string;
  noticePeriodWaived: boolean;
  severanceAmount: string;
}): string {
  const {
    employeeName,
    designation,
    effectiveDate,
    reason,
    remarks,
    noticePeriodWaived,
    severanceAmount,
  } = params;

  const dateStr = effectiveDate
    ? format(new Date(effectiveDate), "MMMM d, yyyy")
    : "[Date not set]";
  const reasonDisplay = reason || "[No reason selected]";
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

Reason for Termination:
${reasonDisplay}

Remarks:
${remarks || "[No remarks provided]"}
${severanceLine}${noticeLine}

Please ensure all company property, access credentials, and pending deliverables are handed over before your last working day.

Regards,
Human Resources Department`;
}


type StatusFilter = "ALL" | TerminationStatus;

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  ...TERMINATION_STATUSES.map((s) => ({
    value: s as StatusFilter,
    label: TERMINATION_STATUS_LABELS[s],
  })),
];


interface TerminationCardProps {
  record: Termination;
  isHR: boolean;
  isCEO: boolean;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSendEmail: (record: Termination) => void;
  onComplete: (id: number) => void;
  isSubmitting: boolean;
  isCompleting: boolean;
}

function TerminationCard({
  record,
  isHR,
  isCEO,
  onSubmit,
  onApprove,
  onReject,
  onSendEmail,
  onComplete,
  isSubmitting,
  isCompleting,
}: TerminationCardProps) {
  const { employee, status, reasons, effectiveDate, severanceAmount, noticePeriodWaived, emailStatus } =
    record;

  const reasonsList = reasons ?? [];
  const visibleReasons = reasonsList.slice(0, 2);
  const extraCount = reasonsList.length - 2;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(employee?.name ?? null)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{employee?.name ?? "Employee"}</p>
              <Badge variant={statusVariant(status)} className="text-[10px] shrink-0">
                {statusLabel(status)}
              </Badge>
              {emailStatus === "failed" && (
                <Badge variant="destructive" className="text-[10px] shrink-0">
                  Email Failed
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
              {employee?.designation && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {employee.designation}
                </span>
              )}
              {employee?.employeeId && <span>ID: {employee.employeeId}</span>}
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

            {status === "REJECTED" && record.ceoRemarks && (
              <p className="text-[11px] text-destructive mt-1 line-clamp-2">
                CEO: {record.ceoRemarks}
              </p>
            )}

            {reasonsList.length > 0 && (
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

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {isHR && status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Submit termination for ${employee?.name ?? "employee"} for CEO approval`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Submit for Approval
              </Button>
            )}

            {isHR && status === "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSubmit(record.id)}
                disabled={isSubmitting}
                aria-label={`Resubmit termination for ${employee?.name ?? "employee"} for CEO approval`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Resubmit
              </Button>
            )}

            {isCEO && status === "PENDING_CEO" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onApprove(record.id)}
                  aria-label={`Approve termination for ${employee?.name ?? "employee"}`}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => onReject(record.id)}
                  aria-label={`Reject termination for ${employee?.name ?? "employee"}`}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {isHR && status === "APPROVED" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSendEmail(record)}
                aria-label={`Send termination email to ${employee?.name ?? "employee"}`}
              >
                <Mail className="h-3 w-3 mr-1" />
                Send Email
              </Button>
            )}

            {isHR && status === "SENT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onComplete(record.id)}
                disabled={isCompleting}
                aria-label={`Complete termination for ${employee?.name ?? "employee"}`}
              >
                <Check className="h-3 w-3 mr-1" />
                Complete
              </Button>
            )}

            {status === "COMPLETED" && (
              <span className="text-[11px] text-muted-foreground italic">Completed</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default function TerminationPage() {
  const { data: session } = useSession();
  const ability = useAbility();

  const role = session?.user?.role;
  const isHR = role === "HR";
  const isCEO = ability.can("manage", "all");

  const { data: terminations, isLoading } = useTerminations();
  const { data: employeesData } = useHrEmployees({ limit: 500 });
  const createTermination = useCreateTermination();
  const submitTermination = useSubmitTermination();
  const ceoReview = useCeoReviewTermination();
  const sendEmail = useSendTerminationEmail();
  const completeTermination = useCompleteTermination();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [noticePeriodWaived, setNoticePeriodWaived] = useState(false);
  const [severanceAmount, setSeveranceAmount] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [submitId, setSubmitId] = useState<number | null>(null);

  const [reviewRecord, setReviewRecord] = useState<Termination | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | null>(null);
  const [ceoRemarks, setCeoRemarks] = useState("");
  const [ceoSheetOpen, setCeoSheetOpen] = useState(false);

  const [emailRecord, setEmailRecord] = useState<Termination | null>(null);
  const [completeId, setCompleteId] = useState<number | null>(null);

  const employees = useMemo<Employee[]>(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData as Employee[];
    const paged = employeesData as { items?: Employee[]; data?: Employee[] };
    return paged.items ?? paged.data ?? [];
  }, [employeesData]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedUserId) ?? null,
    [employees, selectedUserId]
  );

  const letterPreview = useMemo(
    () =>
      buildLetterPreview({
        employeeName: selectedEmployee?.name ?? "",
        designation: selectedEmployee?.designation ?? "",
        effectiveDate,
        reason: selectedReason,
        remarks,
        noticePeriodWaived,
        severanceAmount,
      }),
    [selectedEmployee, effectiveDate, selectedReason, remarks, noticePeriodWaived, severanceAmount]
  );

  const list = useMemo(() => {
    const all = terminations ?? [];
    if (statusFilter === "ALL") return all;
    return all.filter((t) => t.status === statusFilter);
  }, [terminations, statusFilter]);

  const statusCounts = useMemo(() => {
    const all = terminations ?? [];
    const counts: Record<string, number> = { ALL: all.length };
    for (const s of TERMINATION_STATUSES) counts[s] = 0;
    for (const t of all) {
      if (t.status) counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return counts;
  }, [terminations]);


  const resetCreateForm = useCallback(() => {
    setSelectedUserId("");
    setSelectedReason("");
    setRemarks("");
    setEffectiveDate("");
    setNoticePeriodWaived(false);
    setSeveranceAmount("");
    setInternalNotes("");
  }, []);

  const isOtherReason = selectedReason === TERMINATION_REASON_OTHER;

  const handleCreateSubmit = useCallback(() => {
    if (!selectedUserId) {
      toast.error("Please select an employee");
      return;
    }

    const targetEmployee = employees.find((e) => e.id === selectedUserId);
    if (targetEmployee?.role === "CEO") {
      toast.error("CEO cannot be terminated through this workflow");
      return;
    }
    if (targetEmployee && !targetEmployee.isActive) {
      toast.error("This employee has already been terminated or is inactive");
      return;
    }

    if (!selectedReason) {
      toast.error("Please select a termination reason");
      return;
    }

    if (isOtherReason && remarks.trim().length < 10) {
      toast.error("Remarks for 'Other' reason must be at least 10 characters");
      return;
    }

    if (!effectiveDate) {
      toast.error("Please set an effective date");
      return;
    }

    const parsedDate = parseISO(effectiveDate);
    if (!isToday(parsedDate) && !isFuture(parsedDate)) {
      toast.error("Effective date must be today or a future date");
      return;
    }

    createTermination.mutate(
      {
        userId: selectedUserId,
        reasons: [selectedReason],
        detailedExplanation: remarks.trim(),
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
    employees,
    selectedReason,
    isOtherReason,
    remarks,
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
    if (record.emailSentAt) {
      toast.error("Termination email has already been sent");
      return;
    }
    setEmailRecord(record);
  }, []);

  const handleSendEmailConfirm = useCallback(() => {
    if (!emailRecord) return;
    sendEmail.mutate(emailRecord.id, {
      onSuccess: () => {
        toast.success("Termination email sent successfully");
        setEmailRecord(null);
      },
      onError: (e) => {
        toast.error(`Failed to send email: ${getErrorMessage(e)}`);
        setEmailRecord(null);
      },
    });
  }, [emailRecord, sendEmail]);

  const handleCompleteConfirm = useCallback(() => {
    if (!completeId) return;
    completeTermination.mutate(completeId, {
      onSuccess: () => {
        toast.success("Termination completed. Employee deactivated, FnF and asset return initiated.");
        setCompleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [completeId, completeTermination]);


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

  return (
    <PageWrapper
      title="Termination Management"
      subtitle="Manage employee terminations"
      badge={`${(terminations ?? []).length} records`}
      actions={
        isHR || isCEO ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Termination
          </Button>
        ) : undefined
      }
    >
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
          <Button
            key={value}
            size="sm"
            variant={statusFilter === value ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setStatusFilter(value)}
          >
            {label}
            {statusCounts[value] > 0 && (
              <Badge
                variant={statusFilter === value ? "secondary" : "outline"}
                className="ml-1.5 text-[9px] px-1.5 py-0 h-4"
              >
                {statusCounts[value]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {statusFilter === "ALL"
                ? "No termination records found."
                : `No ${TERMINATION_STATUS_LABELS[statusFilter as keyof typeof TERMINATION_STATUS_LABELS] ?? statusFilter} records.`}
            </p>
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
              onComplete={(id) => setCompleteId(id)}
              isSubmitting={submitTermination.isPending}
              isCompleting={completeTermination.isPending}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
        title="New Termination"
        description={isCEO ? "Create a termination record. As CEO, this will be automatically approved." : "Create a termination record. It will be saved as a draft for CEO approval."}
        onSubmit={handleCreateSubmit}
        submitLabel={isCEO ? "Create & Approve" : "Save as Draft"}
        isPending={createTermination.isPending}
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Employee <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger aria-label="Select employee">
              <SelectValue placeholder="Select an employee..." />
            </SelectTrigger>
            <SelectContent>
              {employees
                .filter((emp) => emp.role !== "CEO" && emp.isActive)
                .map((emp) => (
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

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Termination Reason <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedReason} onValueChange={setSelectedReason}>
            <SelectTrigger aria-label="Select termination reason">
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent>
              {TERMINATION_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Remarks{" "}
            {isOtherReason ? (
              <span className="text-destructive">*</span>
            ) : (
              <span className="text-muted-foreground font-normal">(optional)</span>
            )}
          </Label>
          {isOtherReason && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Required: Describe the specific reason for selecting &apos;Other&apos; (min. 10 characters).
            </p>
          )}
          <Textarea
            placeholder={
              isOtherReason
                ? "Describe the specific reason (min. 10 characters)..."
                : "Additional remarks or context..."
            }
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            aria-label="Remarks"
          />
          {isOtherReason && (
            <p className="text-[11px] text-muted-foreground">
              {remarks.length} / 10 min characters
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Effective Date <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            value={effectiveDate}
            min={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => setEffectiveDate(e.target.value)}
            aria-label="Effective date"
          />
          <p className="text-[11px] text-muted-foreground">
            Must be today or a future date.
          </p>
        </div>

        <Separator />

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
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(reviewRecord.employee?.name ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {reviewRecord.employee?.name ?? "Employee"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reviewRecord.employee?.designation ?? "—"}
                  {reviewRecord.employee?.employeeId
                    ? ` · ID: ${reviewRecord.employee.employeeId}`
                    : ""}
                </p>
              </div>
            </div>

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

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Reasons
              </Label>
              <div className="flex flex-wrap gap-1">
                {(reviewRecord.reasons ?? []).map((r) => (
                  <Badge key={r} variant="outline" className="text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Detailed Explanation
              </Label>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {reviewRecord.detailedExplanation}
              </p>
            </div>

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

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                CEO Remarks{" "}
                {reviewDecision === "reject" ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground font-normal">(optional)</span>
                )}
              </Label>
              <Textarea
                placeholder={
                  reviewDecision === "reject"
                    ? "Remarks are required when rejecting..."
                    : "Add any remarks or comments..."
                }
                value={ceoRemarks}
                onChange={(e) => setCeoRemarks(e.target.value)}
                rows={3}
                aria-label="CEO remarks"
              />
            </div>
          </>
        )}
      </HrSheet>

      <ConfirmActionDialog
        open={emailRecord !== null}
        onOpenChange={(open) => {
          if (!open) setEmailRecord(null);
        }}
        title="Send Termination Email"
        description={`Send termination email to ${emailRecord?.employee?.name ?? "this employee"}? The employee will be officially notified. Account deactivation will happen when you mark the termination as Complete.`}
        confirmLabel="Send Email"
        variant="default"
        onConfirm={handleSendEmailConfirm}
        isPending={sendEmail.isPending}
      />

      <ConfirmActionDialog
        open={completeId !== null}
        onOpenChange={(open) => {
          if (!open) setCompleteId(null);
        }}
        title="Complete Termination"
        description="This will deactivate the employee's account, initiate Full & Final settlement, and create asset return records. This action cannot be undone."
        confirmLabel="Complete Termination"
        variant="destructive"
        onConfirm={handleCompleteConfirm}
        isPending={completeTermination.isPending}
      />
    </PageWrapper>
  );
}
