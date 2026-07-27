"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { MemberPicker } from "@/components/shared";
import {
  useSuccessionPlans,
  useCreateSuccessionPlan,
  useDeleteSuccessionPlan,
  type SuccessionReadiness,
} from "@/hooks/api/hr/succession";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/build/shared/resolve-user-name";
import { TruncatedText } from "@/components/ui/truncated-text";
import { successionFormSchema } from "./succession-schema";
import { zodFieldErrors } from "./zod-field-errors";

const READINESS_CONFIG: Record<SuccessionReadiness, { label: string; className: string }> = {
  ready_now: { label: "Ready Now", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  "1_2_years": { label: "1–2 Years", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  "3_plus": { label: "3+ Years", className: "bg-muted text-muted-foreground border-border" },
};

type FormState = {
  roleName: string;
  successorId: string;
  incumbentId: string;
  readiness: SuccessionReadiness;
  note: string;
};

const DEFAULT_FORM: FormState = {
  roleName: "",
  successorId: "",
  incumbentId: "",
  readiness: "ready_now",
  note: "",
};

export function SuccessionTab() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: plans = [], isLoading } = useSuccessionPlans();
  const { data: membersData } = useOrgMembers(1, 200);
  const create = useCreateSuccessionPlan();
  const remove = useDeleteSuccessionPlan();

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, {
        name: member.name,
        email: member.email,
      });
    }
    return map;
  }, [membersData]);

  function resolveMemberName(userId: string | null) {
    if (!userId) return null;
    const member = memberById.get(userId);
    return member ? getUserDisplayName(member) : null;
  }

  async function handleCreate() {
    const parsed = successionFormSchema.safeParse(form);
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    try {
      await create.mutateAsync({
        roleName: parsed.data.roleName,
        successorId: parsed.data.successorId,
        incumbentId: parsed.data.incumbentId || null,
        readiness: parsed.data.readiness,
        note: parsed.data.note || null,
        jobRoleId: null,
      });
      toast.success("Succession plan created");
      setOpen(false);
      setForm(DEFAULT_FORM);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await remove.mutateAsync(id);
      toast.success("Removed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-sm text-muted-foreground">
          {plans.length} succession plan{plans.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-8" onClick={() => setOpen(true)}>
          Add Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-full w-full" />}
          title="No succession plans yet"
          description="Map successors to key roles to ensure leadership continuity."
          action={{ label: "Add Plan", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => {
            const cfg = READINESS_CONFIG[plan.readiness];
            return (
              <Card key={plan.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <TruncatedText text={plan.roleName} className="font-medium text-sm" />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Successor: {resolveMemberName(plan.successorId) ?? plan.successorId}
                      {plan.incumbentId && (
                        <> · Incumbent: {resolveMemberName(plan.incumbentId) ?? plan.incumbentId}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                      {cfg.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(plan.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setForm(DEFAULT_FORM);
          setFieldErrors({});
        }
      }}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>New Succession Plan</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 px-6 py-4">
            <div className="space-y-1">
              <Label>Role / Position</Label>
              <Input
                value={form.roleName}
                onChange={(e) => {
                  setForm((p) => ({ ...p, roleName: e.target.value }));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.roleName;
                    return next;
                  });
                }}
                placeholder="e.g. Head of Engineering"
              />
              {fieldErrors.roleName && <p className="text-xs text-destructive">{fieldErrors.roleName}</p>}
            </div>
            <div className="space-y-1">
              <Label>Successor</Label>
              <MemberPicker
                mode="single"
                value={form.successorId || undefined}
                onChange={(id) => {
                  setForm((p) => ({ ...p, successorId: id ?? "" }));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.successorId;
                    return next;
                  });
                }}
                placeholder="Select successor"
              />
              {fieldErrors.successorId && <p className="text-xs text-destructive">{fieldErrors.successorId}</p>}
            </div>
            <div className="space-y-1">
              <Label>Incumbent (optional)</Label>
              <MemberPicker
                mode="single"
                value={form.incumbentId || undefined}
                onChange={(id) => {
                  setForm((p) => ({ ...p, incumbentId: id ?? "" }));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.incumbentId;
                    return next;
                  });
                }}
                allowUnassigned
                placeholder="Current holder"
              />
              {fieldErrors.incumbentId && <p className="text-xs text-destructive">{fieldErrors.incumbentId}</p>}
            </div>
            <div className="space-y-1">
              <Label>Readiness</Label>
              <Select
                value={form.readiness}
                onValueChange={(v) => {
                  if (v === "ready_now" || v === "1_2_years" || v === "3_plus") {
                    setForm((p) => ({ ...p, readiness: v }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ready_now">Ready Now</SelectItem>
                  <SelectItem value="1_2_years">1–2 Years</SelectItem>
                  <SelectItem value="3_plus">3+ Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input
                value={form.note}
                onChange={(e) => {
                  setForm((p) => ({ ...p, note: e.target.value }));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.note;
                    return next;
                  });
                }}
              />
              {fieldErrors.note && <p className="text-xs text-destructive">{fieldErrors.note}</p>}
            </div>
          </DialogBody>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              isPending={create.isPending}
              onClick={handleCreate}
            >
              Create
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
