"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePIPs, usePIPDetail, useCreatePIP, useUpdatePIP, useAcknowledgePIP } from "@/lib/api/hooks/hr/pip";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { isAdminOrOwner } from "@/lib/auth-helpers";
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
import { toast } from "sonner";
import { AlertTriangle, Plus } from "lucide-react";
import type { Employee } from "@/types/hr";
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

export function PipTab() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const admin = isAdminOrOwner(role) || role === "ADMIN";

  const { data: pips, isLoading } = usePIPs();
  const createPip = useCreatePIP();
  const updatePip = useUpdatePIP();
  const acknowledge = useAcknowledgePIP();

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
  const [expectedImprovement, setExpectedImprovement] = useState("Meet expectations");
  const [consequences, setConsequences] = useState("Extension of PIP");
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
      toast.error("Fill required fields");
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
          toast.success("PIP created (draft — employee must acknowledge)");
          setCreateOpen(false);
          setLinkedAppraisalId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    userId,
    hrRepId,
    description,
    evidence,
    areas,
    goalTitle,
    goalCriteria,
    goalDeadline,
    startDate,
    endDate,
    reviewFrequency,
    reviewMethod,
    expectedImprovement,
    consequences,
    reasonCategory,
    linkedAppraisalId,
    createPip,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} PIPs</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New PIP
        </Button>
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
                    {p.startDate} → {p.endDate} · {p.goals?.length ?? 0} goals
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {p.status ?? "—"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New PIP</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 text-sm">
            {linkedAppraisalId != null && (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed p-2">
                Linked to appraisal <strong>#{linkedAppraisalId}</strong> (from Trigger PIP).
              </p>
            )}
            <div>
              <Label>Employee</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name ?? e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>HR representative</Label>
              <Select value={hrRepId} onValueChange={setHrRepId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select HR user" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => admin || e.id !== userId)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name ?? e.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={reasonCategory} onValueChange={setReasonCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POOR_PERFORMANCE">Poor performance</SelectItem>
                  <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
                  <SelectItem value="POLICY_VIOLATION">Policy violation</SelectItem>
                  <SelectItem value="MISSED_KPIS">Missed KPIs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Evidence</Label>
              <Textarea rows={2} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
            </div>
            <div>
              <Label>Areas of concern (comma-separated)</Label>
              <Input value={areas} onChange={(e) => setAreas(e.target.value)} />
            </div>
            <div className="border-t pt-2 space-y-2">
              <p className="text-xs font-medium">SMART goal</p>
              <Input placeholder="Title" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} />
              <Textarea placeholder="Success criteria" value={goalCriteria} onChange={(e) => setGoalCriteria(e.target.value)} />
              <Input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>PIP start</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>PIP end</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Review frequency</Label>
              <Select value={reviewFrequency} onValueChange={setReviewFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BI_WEEKLY">Bi-weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Review method</Label>
              <Input value={reviewMethod} onChange={(e) => setReviewMethod(e.target.value)} />
            </div>
            <div>
              <Label>Expected improvement</Label>
              <Input value={expectedImprovement} onChange={(e) => setExpectedImprovement(e.target.value)} />
            </div>
            <div>
              <Label>Consequences if not met</Label>
              <Input value={consequences} onChange={(e) => setConsequences(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createPip.isPending}>
              Create draft PIP
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>PIP #{openId}</SheetTitle>
          </SheetHeader>
          {openId && (
            <PipDetailBody
              pipId={openId}
              sessionUserId={session?.user?.id}
              admin={admin}
              onClose={() => setOpenId(null)}
              updatePip={updatePip}
              acknowledge={acknowledge}
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
  updatePip,
  acknowledge,
}: {
  pipId: number;
  sessionUserId?: string;
  admin: boolean;
  onClose: () => void;
  updatePip: ReturnType<typeof useUpdatePIP>;
  acknowledge: ReturnType<typeof useAcknowledgePIP>;
}) {
  const { data: detail, isLoading } = usePIPDetail(pipId);
  const row = detail as (PipRow & { userId: string; status: string | null }) | undefined;

  if (isLoading || !row) {
    return <Skeleton className="h-32 mt-4" />;
  }

  return (
    <div className="mt-4 space-y-3 text-sm">
      <Badge>{row.status}</Badge>
      <p className="text-xs text-muted-foreground">
        {row.startDate} → {row.endDate}
      </p>
      {row.userId === sessionUserId && row.status === "DRAFT" && (
        <Button
          className="w-full"
          onClick={() =>
            acknowledge.mutate(
              { id: pipId, data: { acknowledged: true } },
              {
                onSuccess: () => {
                  toast.success("Acknowledged — PIP is now active");
                  onClose();
                },
                onError: (e) => toast.error(getErrorMessage(e)),
              }
            )
          }
          disabled={acknowledge.isPending}
        >
          Acknowledge PIP
        </Button>
      )}
      {admin && (row.status === "ACTIVE" || row.status === "EXTENDED") && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updatePip.mutate(
                { id: pipId, finalOutcome: "SUCCESS" },
                { onSuccess: () => toast.success("Marked success"), onError: (e) => toast.error(getErrorMessage(e)) }
              )
            }
          >
            Mark success
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updatePip.mutate(
                { id: pipId, finalOutcome: "EXTENDED" },
                { onSuccess: () => toast.success("Marked extended"), onError: (e) => toast.error(getErrorMessage(e)) }
              )
            }
          >
            Mark extended
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updatePip.mutate(
                { id: pipId, finalOutcome: "FAILED" },
                { onSuccess: () => toast.success("Marked failed"), onError: (e) => toast.error(getErrorMessage(e)) }
              )
            }
          >
            Mark failed
          </Button>
        </div>
      )}
    </div>
  );
}
