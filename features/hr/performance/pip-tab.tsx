"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  usePIPs,
  usePIPDetail,
  useCreatePIP,
  useUpdatePIP,
  useAcknowledgePIP,
  useCreatePIPCheckIn,
} from "@/lib/api/hooks/hr/pip";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { isAdminOrOwner } from "@/lib/auth-role-guards";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Plus } from "lucide-react";
import type { Employee } from "@/types/hr";
import type { PIP, PIPGoal } from "@/lib/api/hooks/hr/pip";
import { PIP_CREATE_PREFILL_STORAGE_KEY, type PipCreatePrefillPayload } from "@/lib/hr/pip-prefill-storage";

type PipRow = {
  id: number;
  status: string | null;
  userId: string;
  startDate: string;
  endDate: string;
  user?: { name?: string | null } | null;
  goals?: { id: number; title: string }[];
};

function statusColor(status: string | null) {
  if (!status) return "secondary";
  if (status === "COMPLETED") return "default";
  if (status === "ACTIVE" || status === "EXTENDED") return "outline";
  if (status === "TERMINATED") return "destructive";
  return "secondary";
}

export function PipTab() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const admin = isAdminOrOwner(role) || role === "ADMIN";

  const { data: pips, isLoading } = usePIPs();
  const createPip = useCreatePIP();

  const [openId, setOpenId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const [userId, setUserId] = useState("");
  const [hrRepId, setHrRepId] = useState("");
  const [reasonCategory, setReasonCategory] = useState("POOR_PERFORMANCE");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [areas, setAreas] = useState("Productivity,Quality");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCriteria, setGoalCriteria] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reviewFrequency, setReviewFrequency] = useState("WEEKLY");
  const [reviewMethod, setReviewMethod] = useState("1:1 Meeting");
  const [expectedImprovement, setExpectedImprovement] = useState("Meet expectations consistently");
  const [consequences, setConsequences] = useState("Extension of PIP or performance escalation");
  const [linkedAppraisalId, setLinkedAppraisalId] = useState<number | null>(null);

  useEffect(() => {
    if (!createOpen || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(PIP_CREATE_PREFILL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PipCreatePrefillPayload;
      if (parsed.userId) setUserId(parsed.userId);
      if (typeof parsed.linkedAppraisalId === "number") setLinkedAppraisalId(parsed.linkedAppraisalId);
      sessionStorage.removeItem(PIP_CREATE_PREFILL_STORAGE_KEY);
    } catch {
      sessionStorage.removeItem(PIP_CREATE_PREFILL_STORAGE_KEY);
    }
  }, [createOpen]);

  const list = (Array.isArray(pips) ? pips : []) as PipRow[];

  const handleCreate = useCallback(() => {
    if (!userId || !hrRepId || !description || !evidence || !goalTitle || !goalCriteria || !goalDeadline || !startDate || !endDate) {
      toast.error("Fill all required fields");
      return;
    }
    createPip.mutate(
      {
        userId,
        hrRepId,
        reasonCategory: reasonCategory as "POOR_PERFORMANCE" | "BEHAVIORAL" | "POLICY_VIOLATION" | "MISSED_KPIS",
        description,
        evidence,
        areasOfConcern: areas.split(",").map((s) => s.trim()).filter(Boolean),
        goals: [{ title: goalTitle, successCriteria: goalCriteria, deadline: goalDeadline }],
        startDate,
        endDate,
        reviewFrequency: reviewFrequency as "WEEKLY" | "BI_WEEKLY" | "MONTHLY",
        reviewMethod,
        expectedImprovement,
        consequencesIfNotMet: consequences,
        linkedAppraisalId: linkedAppraisalId ?? undefined,
      },
      {
        onSuccess: () => {
          toast.success("PIP created — employee must acknowledge");
          setCreateOpen(false);
          setLinkedAppraisalId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    userId, hrRepId, description, evidence, areas, goalTitle, goalCriteria,
    goalDeadline, startDate, endDate, reviewFrequency, reviewMethod,
    expectedImprovement, consequences, reasonCategory, linkedAppraisalId, createPip,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{list.length} PIPs</p>
        {admin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New PIP
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No PIPs yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenId(p.id)}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{p.user?.name ?? p.userId}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.startDate} → {p.endDate} · {p.goals?.length ?? 0} goal{p.goals?.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge variant={statusColor(p.status)} className="shrink-0 text-[10px] font-normal">
                  {(p.status ?? "DRAFT").replace(/_/g, " ")}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create sheet */}
      <Sheet open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setLinkedAppraisalId(null); }}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-3">
            <SheetTitle className="text-base">New PIP</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-4 py-4 pb-8 text-sm">
              {linkedAppraisalId != null && (
                <p className="rounded-md border border-dashed border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  Linked to appraisal <strong className="text-foreground">#{linkedAppraisalId}</strong>
                </p>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Employee *</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">HR representative *</Label>
                <Select value={hrRepId} onValueChange={setHrRepId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select HR user" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.id !== userId).map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Reason *</Label>
                <Select value={reasonCategory} onValueChange={setReasonCategory}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POOR_PERFORMANCE">Poor performance</SelectItem>
                    <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
                    <SelectItem value="POLICY_VIOLATION">Policy violation</SelectItem>
                    <SelectItem value="MISSED_KPIS">Missed KPIs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Description *</Label>
                <Textarea rows={3} className="text-sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the performance issue…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Evidence *</Label>
                <Textarea rows={2} className="text-sm" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Specific incidents, dates, data…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Areas of concern (comma-separated)</Label>
                <Input value={areas} onChange={(e) => setAreas(e.target.value)} />
              </div>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Improvement goal</p>
              <Input placeholder="Goal title *" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} />
              <Textarea placeholder="Success criteria *" className="text-sm" rows={2} value={goalCriteria} onChange={(e) => setGoalCriteria(e.target.value)} />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Goal deadline *</Label>
                <Input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">PIP start *</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">PIP end *</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Review frequency</Label>
                <Select value={reviewFrequency} onValueChange={setReviewFrequency}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BI_WEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Review method</Label>
                <Input value={reviewMethod} onChange={(e) => setReviewMethod(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Expected improvement</Label>
                <Input value={expectedImprovement} onChange={(e) => setExpectedImprovement(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Consequences if not met</Label>
                <Input value={consequences} onChange={(e) => setConsequences(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createPip.isPending}>
                Create PIP
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-3">
            <SheetTitle className="text-base">PIP #{openId}</SheetTitle>
          </SheetHeader>
          {openId && (
            <PipDetailBody
              pipId={openId}
              sessionUserId={session?.user?.id}
              admin={admin}
              onClose={() => setOpenId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PipDetailBody({
  pipId,
  sessionUserId,
  admin,
  onClose,
}: {
  pipId: number;
  sessionUserId?: string;
  admin: boolean;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = usePIPDetail(pipId);
  const updatePip = useUpdatePIP();
  const acknowledge = useAcknowledgePIP();
  const addCheckIn = useCreatePIPCheckIn(pipId);

  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [ciDate, setCiDate] = useState(new Date().toISOString().split("T")[0]!);
  const [ciStatus, setCiStatus] = useState<"ON_TRACK" | "AT_RISK" | "NOT_MEETING">("ON_TRACK");
  const [ciManagerSummary, setCiManagerSummary] = useState("");
  const [ciManagerFeedback, setCiManagerFeedback] = useState("");
  const [ciEmployeeComments, setCiEmployeeComments] = useState("");
  const [ciImprovement, setCiImprovement] = useState<"IMPROVED" | "NO_CHANGE" | "DECLINED">("NO_CHANGE");
  const [ciRisk, setCiRisk] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [ciRating, setCiRating] = useState("");
  const [ciGoalProgress, setCiGoalProgress] = useState<Record<number, { status: "ON_TRACK" | "AT_RISK" | "NOT_MEETING"; pct: string; done: string; next: string; blockers: string }>>({});

  const row = detail as (PIP & { checkIns?: { id: number; checkInDate: string; overallStatus: string; managerFeedback: string; summaryCommentsManager: string; managerRating: number | null; improvementSinceLast: string; riskLevel: string }[] }) | undefined;

  useEffect(() => {
    if (!row?.goals) return;
    const init: typeof ciGoalProgress = {};
    for (const g of row.goals) {
      init[g.id] = { status: "ON_TRACK", pct: "50", done: "", next: "", blockers: "" };
    }
    setCiGoalProgress(init);
  }, [row?.goals]);

  const handleAddCheckIn = useCallback(() => {
    if (!ciManagerSummary || !ciManagerFeedback || !ciEmployeeComments) {
      toast.error("Fill required check-in fields");
      return;
    }
    const goals = row?.goals ?? [];
    if (goals.length === 0) {
      toast.error("PIP has no goals — cannot add check-in");
      return;
    }
    const goalProgress = goals.map((g: PIPGoal) => {
      const gp = ciGoalProgress[g.id] ?? { status: "ON_TRACK" as const, pct: "50", done: "In progress", next: "Continue", blockers: "None" };
      return {
        pipGoalId: g.id,
        progressStatus: gp.status,
        percentComplete: Math.min(100, Math.max(0, parseInt(gp.pct || "0", 10))),
        workDone: gp.done || "In progress",
        blockers: gp.blockers || "None",
        nextSteps: gp.next || "Continue as planned",
      };
    });
    addCheckIn.mutate(
      {
        checkInDate: ciDate,
        checkInType: "WEEKLY",
        overallStatus: ciStatus,
        summaryCommentsManager: ciManagerSummary,
        summaryCommentsEmployee: null,
        managerFeedback: ciManagerFeedback,
        managerRating: ciRating ? parseInt(ciRating, 10) : null,
        improvementSinceLast: ciImprovement,
        employeeSelfComments: ciEmployeeComments,
        riskLevel: ciRisk,
        escalationRequired: false,
        goalProgress,
      },
      {
        onSuccess: () => {
          toast.success("Check-in recorded");
          setShowCheckInForm(false);
          setCiManagerSummary("");
          setCiManagerFeedback("");
          setCiEmployeeComments("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [ciDate, ciStatus, ciManagerSummary, ciManagerFeedback, ciEmployeeComments, ciImprovement, ciRisk, ciRating, ciGoalProgress, row?.goals, addCheckIn]);

  if (isLoading || !row) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const statusLabel = (row.status ?? "DRAFT").replace(/_/g, " ");
  const isEmployee = row.userId === sessionUserId;
  const canWrite = admin || row.managerId === sessionUserId || row.hrRepId === sessionUserId;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-4 px-4 py-4 pb-10 text-sm">
        {/* Status + dates */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusColor(row.status)} className="font-normal">{statusLabel}</Badge>
          {row.finalOutcome && (
            <Badge variant="outline" className="font-normal">
              {row.finalOutcome.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {row.startDate} → {row.endDate} · {row.reviewFrequency?.replace("_", "-").toLowerCase()} reviews via {row.reviewMethod}
        </p>

        {row.linkedAppraisalId && (
          <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Linked appraisal <strong className="text-foreground">#{row.linkedAppraisalId}</strong>
          </p>
        )}

        <Separator />

        {/* Description + reason */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Description</p>
          <p className="text-xs leading-relaxed text-foreground/80">{row.description ?? row.reason}</p>
          {row.reasonCategory && (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {row.reasonCategory.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {/* Areas of concern */}
        {(row.areasOfConcern ?? []).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Areas of concern</p>
            <div className="flex flex-wrap gap-1.5">
              {(row.areasOfConcern ?? []).map((a, i) => (
                <Badge key={i} variant="outline" className="text-[10px] font-normal">{a}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Evidence */}
        {row.evidence && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Evidence</p>
            <p className="text-xs leading-relaxed text-foreground/70 rounded-md border bg-muted/30 px-3 py-2">{row.evidence}</p>
          </div>
        )}

        <Separator />

        {/* Goals */}
        {(row.goals ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Improvement goals</p>
            {(row.goals ?? []).map((g: PIPGoal) => (
              <div key={g.id} className="rounded-md border bg-card px-3 py-2.5 space-y-1 shadow-sm">
                <p className="text-xs font-medium">{g.title}</p>
                {g.successCriteria && (
                  <p className="text-[11px] text-muted-foreground">{g.successCriteria}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Deadline: {g.deadline}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Expected improvement + consequences */}
        {(row.expectedImprovement || row.consequencesIfNotMet) && (
          <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5 text-xs">
            {row.expectedImprovement && (
              <p><span className="font-medium">Expected: </span>{row.expectedImprovement}</p>
            )}
            {row.consequencesIfNotMet && (
              <p className="text-destructive/80"><span className="font-medium text-destructive">If not met: </span>{row.consequencesIfNotMet}</p>
            )}
          </div>
        )}

        <Separator />

        {/* Check-ins */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Check-ins ({(row.checkIns ?? []).length})
            </p>
            {canWrite && (row.status === "ACTIVE" || row.status === "DRAFT" || row.status === "EXTENDED") && (
              <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => setShowCheckInForm((v) => !v)}>
                <Plus className="h-3 w-3 mr-1" />
                Add check-in
              </Button>
            )}
          </div>

          {(row.checkIns ?? []).length === 0 && !showCheckInForm && (
            <p className="text-[11px] text-muted-foreground italic">No check-ins recorded yet.</p>
          )}

          {(row.checkIns ?? []).map((ci) => (
            <div key={ci.id} className="rounded-md border bg-card px-3 py-2.5 space-y-1 text-xs shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{ci.checkInDate}</span>
                <span
                  className={
                    ci.overallStatus === "ON_TRACK"
                      ? "text-green-600 dark:text-green-400"
                      : ci.overallStatus === "AT_RISK"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-destructive"
                  }
                >
                  {ci.overallStatus.replace(/_/g, " ")}
                </span>
              </div>
              {ci.summaryCommentsManager && (
                <p className="text-muted-foreground leading-relaxed">{ci.summaryCommentsManager}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                  {ci.improvementSinceLast.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] text-muted-foreground">Risk: {ci.riskLevel}</span>
                {ci.managerRating && (
                  <span className="text-[10px] text-muted-foreground">Rating: {ci.managerRating}/5</span>
                )}
              </div>
            </div>
          ))}

          {/* Check-in form */}
          {showCheckInForm && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-3 text-xs">
              <p className="font-medium text-xs">New check-in</p>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Date</Label>
                <Input type="date" value={ciDate} onChange={(e) => setCiDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Overall status</Label>
                  <Select value={ciStatus} onValueChange={(v) => setCiStatus(v as typeof ciStatus)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ON_TRACK">On track</SelectItem>
                      <SelectItem value="AT_RISK">At risk</SelectItem>
                      <SelectItem value="NOT_MEETING">Not meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Improvement since last</Label>
                  <Select value={ciImprovement} onValueChange={(v) => setCiImprovement(v as typeof ciImprovement)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IMPROVED">Improved</SelectItem>
                      <SelectItem value="NO_CHANGE">No change</SelectItem>
                      <SelectItem value="DECLINED">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Risk level</Label>
                  <Select value={ciRisk} onValueChange={(v) => setCiRisk(v as typeof ciRisk)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-muted-foreground">Manager rating (1–5)</Label>
                  <Input type="number" min={1} max={5} value={ciRating} onChange={(e) => setCiRating(e.target.value)} className="h-8 text-xs" placeholder="Optional" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Summary (manager) *</Label>
                <Textarea rows={2} className="text-xs" value={ciManagerSummary} onChange={(e) => setCiManagerSummary(e.target.value)} placeholder="What was discussed…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Manager feedback *</Label>
                <Textarea rows={2} className="text-xs" value={ciManagerFeedback} onChange={(e) => setCiManagerFeedback(e.target.value)} placeholder="Specific feedback given…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground">Employee self-comments *</Label>
                <Textarea rows={2} className="text-xs" value={ciEmployeeComments} onChange={(e) => setCiEmployeeComments(e.target.value)} placeholder="Employee's perspective…" />
              </div>

              {/* Per-goal progress */}
              {(row.goals ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Goal progress</p>
                  {(row.goals ?? []).map((g: PIPGoal) => {
                    const gp = ciGoalProgress[g.id] ?? { status: "ON_TRACK" as const, pct: "50", done: "", next: "", blockers: "" };
                    return (
                      <div key={g.id} className="rounded border bg-background px-2.5 py-2 space-y-1.5">
                        <p className="text-[10px] font-medium">{g.title}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="space-y-1">
                            <Label className="text-[9px] text-muted-foreground">Status</Label>
                            <Select
                              value={gp.status}
                              onValueChange={(v) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, status: v as "ON_TRACK" | "AT_RISK" | "NOT_MEETING" } }))}
                            >
                              <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ON_TRACK">On track</SelectItem>
                                <SelectItem value="AT_RISK">At risk</SelectItem>
                                <SelectItem value="NOT_MEETING">Not meeting</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] text-muted-foreground">% complete</Label>
                            <Input
                              type="number" min={0} max={100} value={gp.pct}
                              onChange={(e) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, pct: e.target.value } }))}
                              className="h-6 text-[10px]"
                            />
                          </div>
                        </div>
                        <Input
                          className="h-6 text-[10px]" placeholder="Work done"
                          value={gp.done}
                          onChange={(e) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, done: e.target.value } }))}
                        />
                        <Input
                          className="h-6 text-[10px]" placeholder="Blockers (or 'None')"
                          value={gp.blockers}
                          onChange={(e) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, blockers: e.target.value } }))}
                        />
                        <Input
                          className="h-6 text-[10px]" placeholder="Next steps"
                          value={gp.next}
                          onChange={(e) => setCiGoalProgress((prev) => ({ ...prev, [g.id]: { ...gp, next: e.target.value } }))}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleAddCheckIn} disabled={addCheckIn.isPending}>
                  Save check-in
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCheckInForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Employee acknowledge */}
          {isEmployee && row.status === "DRAFT" && (
            <Button
              className="w-full"
              onClick={() =>
                acknowledge.mutate(
                  { id: pipId, data: { acknowledged: true } },
                  {
                    onSuccess: () => {
                      toast.success("PIP acknowledged — status now Active");
                      onClose();
                    },
                    onError: (e) => toast.error(getErrorMessage(e)),
                  }
                )
              }
              disabled={acknowledge.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Acknowledge PIP
            </Button>
          )}

          {/* Admin outcome buttons */}
          {admin && (row.status === "ACTIVE" || row.status === "EXTENDED" || row.status === "DRAFT") && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updatePip.mutate(
                    { id: pipId, finalOutcome: "SUCCESS" },
                    { onSuccess: () => toast.success("PIP marked successful"), onError: (e) => toast.error(getErrorMessage(e)) }
                  )
                }
                disabled={updatePip.isPending}
              >
                Mark success
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updatePip.mutate(
                    { id: pipId, finalOutcome: "EXTENDED" },
                    { onSuccess: () => toast.success("PIP extended"), onError: (e) => toast.error(getErrorMessage(e)) }
                  )
                }
                disabled={updatePip.isPending}
              >
                Extend PIP
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  updatePip.mutate(
                    { id: pipId, finalOutcome: "FAILED" },
                    { onSuccess: () => toast.success("PIP terminated"), onError: (e) => toast.error(getErrorMessage(e)) }
                  )
                }
                disabled={updatePip.isPending}
              >
                Terminate
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
