"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  useResignations, useCreateResignation, useUpdateResignation,
  useResignationDetail, useResignationLetter, useResignationAnalytics,
  type Resignation, type ResignationProgress, type ResignationAnalytics,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import {
  Plus, CheckCircle2, Clock, Calendar, FileText, Download,
  XCircle, Eye, ChevronRight, Undo2, AlertTriangle,
  TrendingDown, Users, BarChart3, Timer,
} from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";

const NOTICE_PERIOD_DAYS = 60;

const REASON_CATEGORIES = [
  "Better Opportunity", "Personal Reasons", "Higher Education",
  "Work Environment", "Compensation", "Role Mismatch",
  "Relocation", "Health Issues", "Starting Own Venture", "Other",
] as const;

function statusBadge(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (status === "COMPLETED" || status === "CEO_APPROVED") return "default";
  if (status === "HR_APPROVED") return "secondary";
  if (status === "WITHDRAWN" || status === "REJECTED") return "destructive";
  return "outline";
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "PENDING_HR": return "Pending HR";
    case "HR_APPROVED": return "HR Approved";
    case "CEO_APPROVED": return "CEO Approved";
    case "IN_PROGRESS": return "In Progress";
    default: return status ?? "Unknown";
  }
}

// ─── Progress Stepper ───
function ProgressStepper({ steps }: { steps: ResignationProgress[] }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center min-w-[80px]">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                step.status === "completed" ? "bg-green-500 border-green-500 text-white" :
                step.status === "active" ? "bg-blue-500 border-blue-500 text-white animate-pulse" :
                step.status === "rejected" ? "bg-red-500 border-red-500 text-white" :
                "bg-muted border-border text-muted-foreground"
              }`}
            >
              {step.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
               step.status === "rejected" ? <XCircle className="h-3.5 w-3.5" /> :
               i + 1}
            </div>
            <p className="text-[10px] mt-1 text-center font-medium">{step.label}</p>
            {step.actor && <p className="text-[9px] text-muted-foreground">{step.actor}</p>}
            {step.timestamp && <p className="text-[9px] text-muted-foreground">{format(new Date(step.timestamp), "MMM d")}</p>}
            {step.remarks && step.status === "rejected" && (
              <p className="text-[9px] text-red-500 max-w-[80px] truncate">{step.remarks}</p>
            )}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-6 mx-0.5 ${
              step.status === "completed" ? "bg-green-500" :
              step.status === "rejected" ? "bg-red-500" :
              "bg-border"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Resignation Detail Sheet ───
function ResignationDetailPanel({
  id, onClose, isAdmin, role,
}: {
  id: number; onClose: () => void; isAdmin: boolean; role: string | undefined;
}) {
  const { data, isLoading } = useResignationDetail(id);
  const { data: letterData } = useResignationLetter(id);
  const updateResignation = useUpdateResignation();
  const [remarks, setRemarks] = useState("");
  const [showLetter, setShowLetter] = useState(false);

  const handleAction = useCallback((status: string) => {
    if ((status === "REJECTED") && !remarks.trim()) {
      toast.error("Remarks are required for rejection");
      return;
    }
    updateResignation.mutate(
      { id, status, remarks: remarks.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Resignation ${status === "REJECTED" ? "rejected" : status === "WITHDRAWN" ? "withdrawn" : "updated"}`);
          setRemarks("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [id, remarks, updateResignation]);

  if (isLoading || !data) {
    return <div className="space-y-3 p-4"><Skeleton className="h-20" /><Skeleton className="h-40" /><Skeleton className="h-20" /></div>;
  }

  const canHrReview = isAdmin && role === "HR" && (data.status === "PENDING_HR" || data.status === "SUBMITTED");
  const canCeoReview = role === "CEO" && data.status === "HR_APPROVED";
  const canWithdraw = data.userId === data.user?.id && !["CEO_APPROVED", "COMPLETED", "IN_PROGRESS", "REJECTED", "WITHDRAWN"].includes(data.status ?? "");

  return (
    <div className="space-y-4 p-1">
      {/* Employee Profile Card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={resolveImageUrl(data.user?.image ?? null)} />
            <AvatarFallback className="bg-primary/10 text-primary">{data.user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{data.user?.name}</p>
            <p className="text-xs text-muted-foreground">{data.user?.designation}</p>
            {data.user?.joiningDate && (
              <p className="text-[10px] text-muted-foreground">Joined: {format(new Date(data.user.joiningDate), "MMM d, yyyy")}</p>
            )}
          </div>
          <Badge variant={statusBadge(data.status)} className="ml-auto">{statusLabel(data.status)}</Badge>
        </CardContent>
      </Card>

      {/* Progress Tracker */}
      {data.progress && <ProgressStepper steps={data.progress} />}

      {/* Resignation Details */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Resignation Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Category:</span> <strong>{data.reasonCategory ?? "N/A"}</strong></div>
            <div><span className="text-muted-foreground">Last Working Date:</span> <strong>{data.lastWorkingDate ? format(new Date(data.lastWorkingDate), "MMM d, yyyy") : "N/A"}</strong></div>
            <div><span className="text-muted-foreground">Notice Period:</span> <strong>{data.noticePeriodDays} days</strong></div>
            <div><span className="text-muted-foreground">Exit Interview:</span> <strong>{data.willingForExitInterview ? "Yes" : "No"}</strong></div>
          </div>
          <div>
            <span className="text-muted-foreground">Reason:</span>
            <p className="mt-1 p-2 rounded bg-muted text-xs">{data.reason}</p>
          </div>
          {data.companyFeedback && (
            <div>
              <span className="text-muted-foreground">Company Feedback:</span>
              <p className="mt-1 p-2 rounded bg-muted text-xs">{data.companyFeedback}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resignation Letter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Resignation Letter
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

      {/* Action Buttons */}
      {(canHrReview || canCeoReview) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder="Remarks (required for rejection)..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAction(canHrReview ? "HR_APPROVED" : "CEO_APPROVED")}
                disabled={updateResignation.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction("REJECTED")}
                disabled={updateResignation.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Resignation Analytics (HR/CEO) ───
function ResignationAnalyticsPanel() {
  const { data, isLoading } = useResignationAnalytics();
  if (isLoading || !data) return null;

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold">{data.attritionRate}%</p>
            <p className="text-[10px] text-muted-foreground">Attrition Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{data.totalResignations}</p>
            <p className="text-[10px] text-muted-foreground">Total Resignations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Timer className="h-4 w-4 mx-auto text-purple-500 mb-1" />
            <p className="text-2xl font-bold">{data.averageTenureMonths}m</p>
            <p className="text-[10px] text-muted-foreground">Avg Tenure at Exit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
            <p className="text-2xl font-bold">{data.statusCounts?.["PENDING_HR"] ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Reason Breakdown */}
      {data.reasonBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Top Resignation Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.reasonBreakdown
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((r) => {
                  const maxCount = data.reasonBreakdown[0]?.count ?? 1;
                  return (
                    <div key={r.category} className="flex items-center gap-2">
                      <span className="text-xs w-32 truncate text-muted-foreground">{r.category}</span>
                      <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                        <div
                          className="h-full rounded bg-primary/60 transition-all"
                          style={{ width: `${(r.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-6 text-right">{r.count}</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend */}
      {data.monthlyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Monthly Resignation Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {data.monthlyTrend.map((m) => {
                const maxVal = Math.max(...data.monthlyTrend.map((t) => t.count), 1);
                const height = (m.count / maxVal) * 100;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-medium">{m.count}</span>
                    <div
                      className="w-full rounded-t bg-red-400/70 min-h-[2px] transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[8px] text-muted-foreground">{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ───
export default function ExitManagementPage() {
  const { data: session } = useSession();
  const { data: resignations, isLoading } = useResignations();
  const createResignation = useCreateResignation();
  const updateResignation = useUpdateResignation();
  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "HR";
  const role = session?.user?.role;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [reasonCategory, setReasonCategory] = useState<string>("");
  const [companyFeedback, setCompanyFeedback] = useState("");
  const [willingForInterview, setWillingForInterview] = useState(true);

  const autoLwd = format(addDays(new Date(), NOTICE_PERIOD_DAYS), "yyyy-MM-dd");

  const handleSubmitResignation = useCallback(() => {
    if (!reasonCategory) {
      toast.error("Please select a reason category");
      return;
    }
    if (reason.trim().length < 50) {
      toast.error("Detailed reason must be at least 50 characters");
      return;
    }
    createResignation.mutate(
      {
        reason: reason.trim(),
        reasonCategory,
        lastWorkingDate: autoLwd,
        noticePeriodDays: NOTICE_PERIOD_DAYS,
        willingForExitInterview: willingForInterview,
        companyFeedback: companyFeedback.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Resignation submitted");
          setSheetOpen(false);
          setReason("");
          setReasonCategory("");
          setCompanyFeedback("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [reason, reasonCategory, autoLwd, willingForInterview, companyFeedback, createResignation]);

  if (isLoading) {
    return (
      <PageWrapper title="Exit Management" subtitle="Resignations and offboarding">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Exit Management"
      subtitle="Resignations, exit interviews, and offboarding"
      badge={`${resignations?.length ?? 0} records`}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Submit Resignation
        </Button>
      }
    >
      {isAdmin && <ResignationAnalyticsPanel />}

      {!resignations?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Image
              src="/illustrations/undraw-quitting-time.svg"
              alt="No resignations"
              width={200}
              height={160}
              className="mx-auto mb-4 opacity-90"
            />
            <p className="text-sm text-muted-foreground">No resignations on record.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {resignations.map((r: Resignation) => {
            const daysLeft = r.lastWorkingDate ? differenceInDays(new Date(r.lastWorkingDate), new Date()) : null;
            return (
              <Card key={r.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setDetailId(r.id)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={resolveImageUrl(r.user?.image ?? null)} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{r.user?.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{r.user?.name ?? "Employee"}</p>
                      <Badge variant={statusBadge(r.status)} className="text-[10px]">{statusLabel(r.status)}</Badge>
                      {r.reasonCategory && <Badge variant="outline" className="text-[10px]">{r.reasonCategory}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      {r.user?.designation && <span>{r.user.designation}</span>}
                      {r.lastWorkingDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          LWD: {format(new Date(r.lastWorkingDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {daysLeft !== null && daysLeft > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {daysLeft} days left
                        </span>
                      )}
                      <span>{r.noticePeriodDays}d notice</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submit Resignation Sheet */}
      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Submit Resignation" onSubmit={handleSubmitResignation} submitLabel="Submit" isPending={createResignation.isPending}>
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Notice period is <strong className="text-foreground">60 days</strong>.
            Your last working date will be <strong className="text-foreground">{format(addDays(new Date(), NOTICE_PERIOD_DAYS), "dd MMM yyyy")}</strong>.
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason Category *</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value)}
          >
            <option value="">Select a reason...</option>
            {REASON_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Detailed Reason * <span className="text-muted-foreground font-normal">(min 50 chars)</span></label>
          <Textarea
            placeholder="Please describe your reason for leaving in detail..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <p className="text-[10px] text-muted-foreground">{reason.length}/50 characters minimum</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="exitInterview"
            checked={willingForInterview}
            onChange={(e) => setWillingForInterview(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="exitInterview" className="text-sm">Willing for exit interview</label>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Feedback for Company <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Textarea
            placeholder="Any feedback you'd like to share with the company..."
            value={companyFeedback}
            onChange={(e) => setCompanyFeedback(e.target.value)}
            rows={3}
          />
        </div>
      </HrSheet>

      {/* Resignation Detail Sheet */}
      <HrSheet
        open={detailId !== null}
        onOpenChange={(open) => { if (!open) setDetailId(null); }}
        title="Resignation Details"
        showSubmit={false}
      >
        {detailId && (
          <ResignationDetailPanel
            id={detailId}
            onClose={() => setDetailId(null)}
            isAdmin={isAdmin}
            role={role}
          />
        )}
      </HrSheet>
    </PageWrapper>
  );
}
