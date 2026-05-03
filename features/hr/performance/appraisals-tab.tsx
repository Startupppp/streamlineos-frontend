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
import { format } from "date-fns";
import { AlertTriangle, ClipboardList, Download, Plus, RefreshCw } from "lucide-react";
import type { Employee } from "@/types/hr";

type AppraisalRow = {
  id: number;
  currentStage: string | null;
  overallRating: string | null;
  userId: string;
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
  reviewerId?: string | null;
  categoryRatings?: CategoryRating[];
  outcomeNotes?: string | null;
  confidentialityNote?: string | null;
};

export function AppraisalsTab() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const admin = isAdminOrOwner(role) || role === "ADMIN";

  const [myOnly, setMyOnly] = useState(false);
  const { data: list, isLoading } = useAppraisals(myOnly ? { myActions: true } : undefined);
  const [openId, setOpenId] = useState<number | null>(null);
  const { data: detail, isLoading: detailLoading } = useAppraisal(openId);
  useAppraisalCategories();
  const create = useCreateAppraisal();
  const patchRatings = usePatchAppraisalRatings(openId ?? 0);
  const patchMeta = usePatchAppraisalMeta(openId ?? 0);
  const completeStage = useCompleteAppraisalStage(openId ?? 0);
  const reopen = useReopenAppraisal();
  const exportPdf = useExportAppraisalPdf();

  const [createOpen, setCreateOpen] = useState(false);
  const [empId, setEmpId] = useState("");
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

  const [localRatings, setLocalRatings] = useState<Map<number, { selfScore?: string; selfText?: string; managerScore?: string; managerComment?: string }>>(
    new Map()
  );

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
            selfScore:
              rt === "TEXT" ? null : loc.selfScore === "" || loc.selfScore === undefined ? null : Number(loc.selfScore),
            selfText: loc.selfText ?? "",
            managerScore: undefined,
            managerComment: undefined,
          };
        }
        return {
          ...base,
          managerScore:
            rt === "TEXT" ? null : loc.managerScore === "" || loc.managerScore === undefined ? null : Number(loc.managerScore),
          managerComment: loc.managerComment ?? "",
          selfScore: undefined,
          selfText: undefined,
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
      toast.error("Employee and period required");
      return;
    }
    create.mutate(
      { userId: empId, type, periodStart: pStart, periodEnd: pEnd },
      {
        onSuccess: () => {
          toast.success("Appraisal created");
          setCreateOpen(false);
          setEmpId("");
          setPStart("");
          setPEnd("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [empId, pStart, pEnd, type, create]);

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
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New appraisal
          </Button>
        </div>
      </div>

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
                <Badge variant="secondary" className="text-[10px]">
                  {a.currentStage ?? "—"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New appraisal</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={empId} onValueChange={setEmpId}>
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
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="MID_YEAR">Mid-year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Period start</Label>
                <Input type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} />
              </div>
              <div>
                <Label>Period end</Label>
                <Input type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={create.isPending}>
              Create
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Appraisal #{openId}</SheetTitle>
          </SheetHeader>
          {detailLoading || !d ? (
            <Skeleton className="h-40 mt-4" />
          ) : (
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>{d.currentStage}</Badge>
                {d.overallRating && <Badge variant="outline">Overall {d.overallRating}</Badge>}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Stages</p>
                <ul className="text-xs space-y-1">
                  {(d.stages ?? []).map((s) => (
                    <li key={s.id}>
                      {s.stage} — {s.status}
                      {s.dueAt && <> (due {format(new Date(s.dueAt), "MMM d")})</>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-medium">Ratings</p>
                {(d.categoryRatings ?? []).map((r) => {
                  const loc = localRatings.get(r.categoryId) ?? {};
                  const rt = r.category?.ratingType ?? "BOTH";
                  return (
                    <div key={r.id} className="rounded-md border p-2 space-y-2">
                      <p className="font-medium text-xs">{r.category?.name}</p>
                      {(rt === "NUMERIC" || rt === "BOTH") && (
                        <div className={`grid gap-2 ${hideManagerInputs ? "grid-cols-1" : "grid-cols-2"}`}>
                          <div>
                            <Label className="text-[10px]">Self 1–5</Label>
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
                              <Label className="text-[10px]">Mgr 1–5</Label>
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
                        <div className="space-y-1">
                          <Label className="text-[10px]">Self text</Label>
                          <Textarea
                            rows={2}
                            className="text-xs"
                            value={loc.selfText ?? ""}
                            onChange={(e) => updateLocal(r.categoryId, "selfText", e.target.value)}
                          />
                          {!hideManagerInputs && (
                            <>
                              <Label className="text-[10px]">Manager text</Label>
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

              {canEditMeta && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-xs font-medium">Outcome & confidentiality (placeholders)</p>
                  <div>
                    <Label className="text-[10px]">Outcome notes (Q16 placeholder)</Label>
                    <Textarea
                      rows={3}
                      className="text-xs mt-1"
                      value={outcomeDraft}
                      onChange={(e) => setOutcomeDraft(e.target.value)}
                      placeholder="Free-text outcomes, recommendations, etc."
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Confidentiality note (Q18 placeholder)</Label>
                    <Textarea
                      rows={2}
                      className="text-xs mt-1"
                      value={confidentialityDraft}
                      onChange={(e) => setConfidentialityDraft(e.target.value)}
                      placeholder="Visibility rules pending — capture context for HR."
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!openId || patchMeta.isPending}
                    onClick={() =>
                      patchMeta.mutate(
                        { outcomeNotes: outcomeDraft || null, confidentialityNote: confidentialityDraft || null },
                        {
                          onSuccess: () => toast.success("Appraisal notes saved"),
                          onError: (e) => toast.error(getErrorMessage(e)),
                        }
                      )
                    }
                  >
                    Save notes
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t pt-3">
                {d.currentStage === "SELF_REVIEW" && session?.user?.id === d.userId && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => handleSaveRatings("self")} disabled={patchRatings.isPending}>
                      Save self-review
                    </Button>
                    <Button size="sm" onClick={() => completeStage.mutate({}, { onSuccess: () => toast.success("Submitted"), onError: (e) => toast.error(getErrorMessage(e)) })} disabled={completeStage.isPending}>
                      Submit self-review
                    </Button>
                  </>
                )}
                {d.currentStage === "MANAGER_REVIEW" && session?.user?.id === d.reviewerId && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => handleSaveRatings("manager")} disabled={patchRatings.isPending}>
                      Save manager review
                    </Button>
                    <Button size="sm" onClick={() => completeStage.mutate({}, { onSuccess: () => toast.success("Submitted"), onError: (e) => toast.error(getErrorMessage(e)) })} disabled={completeStage.isPending}>
                      Submit manager review
                    </Button>
                  </>
                )}
                {d.currentStage &&
                  !["SELF_REVIEW", "MANAGER_REVIEW", "CLOSED"].includes(d.currentStage) &&
                  d.stages?.some((s) => s.stage === d.currentStage && s.status === "PENDING" && s.assigneeId === session?.user?.id) && (
                    <Button
                      size="sm"
                      onClick={() =>
                        completeStage.mutate({}, {
                          onSuccess: () => toast.success("Stage completed"),
                          onError: (e) => toast.error(getErrorMessage(e)),
                        })
                      }
                      disabled={completeStage.isPending}
                    >
                      Complete stage
                    </Button>
                  )}
                {admin && d.currentStage === "CLOSED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      reopen.mutate(d.id, {
                        onSuccess: () => toast.success("Reopened"),
                        onError: (e) => toast.error(getErrorMessage(e)),
                      })
                    }
                    disabled={reopen.isPending}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Reopen
                  </Button>
                )}
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
                      toast.message("Open PIP tab — form is pre-filled from this appraisal.");
                    }}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    Trigger PIP
                  </Button>
                )}
                {admin && (
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
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
