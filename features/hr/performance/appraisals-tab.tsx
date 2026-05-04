"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAppraisals,
  useAppraisal,
  useAppraisalCategories,
  useCompleteAppraisalStage,
  useCreateAppraisal,
  usePatchAppraisalRatings,
  usePatchAppraisalMeta,
  useReopenAppraisal,
  useExportAppraisalPdf,
} from "@/lib/api/hooks/hr";
import { PIP_CREATE_PREFILL_STORAGE_KEY, type PipCreatePrefillPayload } from "@/lib/hr/pip-prefill-storage";
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
import { AlertTriangle, ClipboardList, Download, Plus, RefreshCw } from "lucide-react";
import type { Employee } from "@/types/hr";

type AppraisalRow = {
  id: number;
  currentStage: string | null;
  overallRating: string | null;
  userId: string;
  reviewerId?: string | null;
  user?: { name?: string | null } | null;
  stages?: { id: number; stage: string; status: string; assigneeId: string | null; dueAt: string | null }[];
};

type CategoryRating = {
  id: number;
  categoryId: number;
  selfScore: string | null;
  selfText: string | null;
  managerScore: string | null;
  managerComment: string | null;
  category?: { id: number; name: string; ratingType: string } | null;
};

type AppraisalDetail = AppraisalRow & {
  categoryRatings?: CategoryRating[];
  outcomeNotes?: string | null;
  confidentialityNote?: string | null;
};

function stageBadgeColor(stage: string | null) {
  if (!stage) return "secondary";
  if (stage === "CLOSED") return "default";
  if (stage === "SELF_REVIEW") return "outline";
  return "secondary";
}

function stageLabel(stage: string | null) {
  if (!stage) return "—";
  const map: Record<string, string> = {
    CYCLE_INITIATION: "Setup",
    SELF_REVIEW: "Self Review",
    MANAGER_REVIEW: "Manager Review",
    CEO_REVIEW: "CEO Review",
    COMPENSATION_REVIEW: "Comp Review",
    FINAL_APPROVAL: "Final Approval",
    EMPLOYEE_ACK: "Pending Ack",
    CLOSED: "Closed",
  };
  return map[stage] ?? stage.replace(/_/g, " ");
}

function completeButtonLabel(stage: string | null) {
  if (!stage) return "Complete stage";
  if (stage === "SELF_REVIEW") return "Submit self-review";
  if (stage === "MANAGER_REVIEW") return "Submit manager review";
  if (stage === "EMPLOYEE_ACK") return "Acknowledge & close";
  return "Complete stage";
}

export function AppraisalsTab() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const admin = isAdminOrOwner(role) || role === "ADMIN";

  const [myOnly, setMyOnly] = useState(false);
  const { data: list, isLoading } = useAppraisals(myOnly ? { myActions: true } : undefined);
  const { data: categories } = useAppraisalCategories();
  const [openId, setOpenId] = useState<number | null>(null);
  const { data: detail, isLoading: detailLoading } = useAppraisal(openId);
  const create = useCreateAppraisal();
  const patchRatings = usePatchAppraisalRatings(openId ?? 0);
  const patchMeta = usePatchAppraisalMeta(openId ?? 0);
  const completeStage = useCompleteAppraisalStage(openId ?? 0);
  const reopen = useReopenAppraisal();
  const exportPdf = useExportAppraisalPdf();

  const [createOpen, setCreateOpen] = useState(false);
  const [empId, setEmpId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [type, setType] = useState("ANNUAL");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");

  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const appraisals = (Array.isArray(list) ? list : []) as AppraisalRow[];
  const d = detail as AppraisalDetail | undefined;
  const catList = Array.isArray(categories) ? categories : [];

  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [confidentialityDraft, setConfidentialityDraft] = useState("");

  useEffect(() => {
    setOutcomeDraft(d?.outcomeNotes ?? "");
    setConfidentialityDraft(d?.confidentialityNote ?? "");
  }, [d?.outcomeNotes, d?.confidentialityNote, openId]);

  const canEditMeta = admin || (!!d && session?.user?.id === d.reviewerId);

  const canTriggerPip =
    !!d && d.currentStage === "CLOSED" && canEditMeta && !!d.userId;

  const hideManagerInputs =
    !!d &&
    session?.user?.id === d.userId &&
    !!d.currentStage &&
    !["EMPLOYEE_ACK", "CLOSED"].includes(d.currentStage);

  const ratingDraft = useMemo(() => {
    const m = new Map<number, { selfScore?: string; selfText?: string; managerScore?: string; managerComment?: string }>();
    for (const r of d?.categoryRatings ?? []) {
      m.set(r.categoryId, {
        selfScore: r.selfScore ?? "",
        selfText: r.selfText ?? "",
        managerScore: r.managerScore ?? "",
        managerComment: r.managerComment ?? "",
      });
    }
    return m;
  }, [d?.categoryRatings]);

  const [localRatings, setLocalRatings] = useState<
    Map<number, { selfScore?: string; selfText?: string; managerScore?: string; managerComment?: string }>
  >(new Map());

  useEffect(() => {
    setLocalRatings(new Map(ratingDraft));
  }, [ratingDraft, openId]);

  const updateLocal = useCallback((categoryId: number, field: string, value: string) => {
    setLocalRatings((prev) => {
      const n = new Map(prev);
      const cur = { ...n.get(categoryId) };
      if (field === "selfScore") cur.selfScore = value;
      if (field === "selfText") cur.selfText = value;
      if (field === "managerScore") cur.managerScore = value;
      if (field === "managerComment") cur.managerComment = value;
      n.set(categoryId, cur);
      return n;
    });
  }, []);

  const handleSaveRatings = useCallback(
    (mode: "self" | "manager") => {
      if (!openId || !d?.categoryRatings?.length) return;
      const ratings = d.categoryRatings.map((r) => {
        const loc = localRatings.get(r.categoryId) ?? {};
        const rt = r.category?.ratingType ?? "BOTH";
        const base = { categoryId: r.categoryId };
        if (mode === "self") {
          return {
            ...base,
            selfScore: rt === "TEXT" ? null : loc.selfScore ? Number(loc.selfScore) : null,
            selfText: loc.selfText ?? "",
          };
        }
        return {
          ...base,
          managerScore: rt === "TEXT" ? null : loc.managerScore ? Number(loc.managerScore) : null,
          managerComment: loc.managerComment ?? "",
        };
      });
      patchRatings.mutate(
        { ratings },
        {
          onSuccess: () => toast.success("Ratings saved"),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [openId, d, localRatings, patchRatings]
  );

  const handleCreate = useCallback(() => {
    if (!empId || !pStart || !pEnd) {
      toast.error("Employee and period are required");
      return;
    }
    create.mutate(
      { userId: empId, reviewerId: reviewerId || undefined, type, periodStart: pStart, periodEnd: pEnd },
      {
        onSuccess: () => {
          toast.success("Appraisal created — employee can now fill self-review");
          setCreateOpen(false);
          setEmpId("");
          setReviewerId("");
          setPStart("");
          setPEnd("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [empId, reviewerId, pStart, pEnd, type, create]);

  const handleCompleteStage = useCallback(() => {
    completeStage.mutate(
      {},
      {
        onSuccess: () => toast.success("Stage completed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [completeStage]);

  const canCompleteCurrentStage = useMemo(() => {
    if (!d?.currentStage || d.currentStage === "CLOSED") return false;
    if (admin) return true;
    return d.stages?.some(
      (s) => s.stage === d.currentStage && s.status === "PENDING" && s.assigneeId === session?.user?.id
    ) ?? false;
  }, [d, admin, session?.user?.id]);

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{appraisals.length} appraisals</p>
        <div className="flex flex-wrap gap-2">
          <Button variant={myOnly ? "default" : "outline"} size="sm" onClick={() => setMyOnly((v) => !v)}>
            My actions
          </Button>
          {admin && (
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New appraisal
            </Button>
          )}
        </div>
      </div>

      {admin && catList.length === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          No rating categories found. Seed defaults first — POST{" "}
          <code className="font-mono">/api/hr/performance/seed</code> to add categories + test data.
        </div>
      )}

      {appraisals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No appraisals yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {appraisals.map((a) => (
            <Card key={a.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenId(a.id)}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{a.user?.name ?? a.userId}</p>
                  <p className="text-[10px] text-muted-foreground">#{a.id}</p>
                </div>
                <Badge variant={stageBadgeColor(a.currentStage)} className="shrink-0 text-[10px] font-normal">
                  {stageLabel(a.currentStage)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-3">
            <SheetTitle className="text-base">New appraisal</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-4 py-4 pb-8 text-sm">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Employee *</Label>
                <Select value={empId} onValueChange={setEmpId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select employee" />
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
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Reviewer / Manager</Label>
                <Select value={reviewerId} onValueChange={setReviewerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auto (from reporting manager)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto (from reporting manager)</SelectItem>
                    {employees
                      .filter((e) => e.id !== empId)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name ?? e.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="MID_YEAR">Mid-year</SelectItem>
                    <SelectItem value="PROBATION_COMPLETION">Probation completion</SelectItem>
                    <SelectItem value="CONFIRMATION">Confirmation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Period start *</Label>
                  <Input type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Period end *</Label>
                  <Input type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={create.isPending}>
                Create appraisal
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 space-y-1 border-b px-4 py-3">
            <SheetTitle className="text-base">
              {d?.user?.name ?? "Appraisal"} — #{openId}
            </SheetTitle>
          </SheetHeader>
          {detailLoading || !d ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5 px-4 py-4 pb-10 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="font-normal">{stageLabel(d.currentStage)}</Badge>
                  {d.overallRating && <Badge variant="outline">Overall {d.overallRating}</Badge>}
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Stage timeline</p>
                  <ul className="text-xs space-y-1.5 rounded-md border bg-muted/30 p-3">
                    {(d.stages ?? []).map((s) => (
                      <li key={s.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="font-medium">{stageLabel(s.stage)}</span>
                        <span
                          className={
                            s.status === "COMPLETED"
                              ? "text-green-600 dark:text-green-400"
                              : s.status === "PENDING"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                          }
                        >
                          {s.status.toLowerCase()}
                        </span>
                        {s.dueAt && s.status === "PENDING" && (
                          <span className="text-muted-foreground">· due {format(new Date(s.dueAt), "MMM d")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {(d.categoryRatings ?? []).length === 0 ? (
                  <div className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                    No rating categories configured.{" "}
                    {admin && "Run the seed endpoint to add default categories."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Ratings</p>
                    {(d.categoryRatings ?? []).map((r) => {
                      const loc = localRatings.get(r.categoryId) ?? {};
                      const rt = r.category?.ratingType ?? "BOTH";
                      return (
                        <div key={r.id} className="rounded-md border bg-card p-3 space-y-3 shadow-sm">
                          <p className="font-medium text-xs leading-snug">{r.category?.name}</p>
                          {(rt === "NUMERIC" || rt === "BOTH") && (
                            <div className={`grid gap-2 ${hideManagerInputs ? "grid-cols-1" : "grid-cols-2"}`}>
                              <div>
                                <Label className="text-[10px]">Self score (1–5)</Label>
                                <Input
                                  value={loc.selfScore ?? ""}
                                  onChange={(e) => updateLocal(r.categoryId, "selfScore", e.target.value)}
                                  type="number"
                                  min={1}
                                  max={5}
                                />
                              </div>
                              {!hideManagerInputs && (
                                <div>
                                  <Label className="text-[10px]">Manager score (1–5)</Label>
                                  <Input
                                    value={loc.managerScore ?? ""}
                                    onChange={(e) => updateLocal(r.categoryId, "managerScore", e.target.value)}
                                    type="number"
                                    min={1}
                                    max={5}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          {(rt === "TEXT" || rt === "BOTH") && (
                            <div className="space-y-1.5">
                              <Label className="text-[10px]">Self comment</Label>
                              <Textarea
                                rows={2}
                                className="text-xs"
                                value={loc.selfText ?? ""}
                                onChange={(e) => updateLocal(r.categoryId, "selfText", e.target.value)}
                              />
                              {!hideManagerInputs && (
                                <>
                                  <Label className="text-[10px]">Manager comment</Label>
                                  <Textarea
                                    rows={2}
                                    className="text-xs"
                                    value={loc.managerComment ?? ""}
                                    onChange={(e) => updateLocal(r.categoryId, "managerComment", e.target.value)}
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {canEditMeta && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">Outcome notes</p>
                      <Textarea
                        rows={3}
                        className="text-xs"
                        value={outcomeDraft}
                        onChange={(e) => setOutcomeDraft(e.target.value)}
                        placeholder="Recommendations, final observations…"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={patchMeta.isPending}
                        onClick={() =>
                          patchMeta.mutate(
                            { outcomeNotes: outcomeDraft || null },
                            {
                              onSuccess: () => toast.success("Notes saved"),
                              onError: (e) => toast.error(getErrorMessage(e)),
                            }
                          )
                        }
                      >
                        Save notes
                      </Button>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex flex-wrap gap-2">
                  {/* Save ratings — show if this user is assignee or admin */}
                  {canCompleteCurrentStage && (d.categoryRatings ?? []).length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleSaveRatings(
                          d.currentStage === "MANAGER_REVIEW" && session?.user?.id !== d.userId
                            ? "manager"
                            : "self"
                        )
                      }
                      disabled={patchRatings.isPending}
                    >
                      Save ratings
                    </Button>
                  )}

                  {/* Complete / submit stage */}
                  {canCompleteCurrentStage && (
                    <Button size="sm" onClick={handleCompleteStage} disabled={completeStage.isPending}>
                      {completeButtonLabel(d.currentStage)}
                    </Button>
                  )}

                  {/* Reopen */}
                  {admin && d.currentStage === "CLOSED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        reopen.mutate(d.id, {
                          onSuccess: () => toast.success("Appraisal reopened"),
                          onError: (e) => toast.error(getErrorMessage(e)),
                        })
                      }
                      disabled={reopen.isPending}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Reopen
                    </Button>
                  )}

                  {/* Trigger PIP */}
                  {canTriggerPip && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const payload: PipCreatePrefillPayload = {
                          userId: d.userId,
                          linkedAppraisalId: d.id,
                        };
                        try {
                          sessionStorage.setItem(PIP_CREATE_PREFILL_STORAGE_KEY, JSON.stringify(payload));
                        } catch {
                          /* ignore */
                        }
                        router.replace(`?tab=pip`);
                        setOpenId(null);
                        toast.message("PIP tab opened — form is pre-filled.");
                      }}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      Trigger PIP
                    </Button>
                  )}

                  {/* Export */}
                  {canEditMeta && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        exportPdf.mutate(d.id, {
                          onSuccess: (blob) => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `appraisal-${d.id}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);
                          },
                          onError: (e) => toast.error(getErrorMessage(e)),
                        })
                      }
                      disabled={exportPdf.isPending}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Export PDF
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
