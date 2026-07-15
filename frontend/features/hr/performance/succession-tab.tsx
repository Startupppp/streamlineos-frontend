"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  useSuccessionPlans,
  useCreateSuccessionPlan,
  useDeleteSuccessionPlan,
  type SuccessionReadiness,
} from "@/hooks/api/hr/succession";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";

const READINESS_CONFIG: Record<SuccessionReadiness, { label: string; className: string }> = {
  ready_now: { label: "Ready Now", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  "1_2_years": { label: "1–2 Years", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  "3_plus": { label: "3+ Years", className: "bg-muted text-muted-foreground border-border dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700" },
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

  const { data: plans = [], isLoading } = useSuccessionPlans();
  const create = useCreateSuccessionPlan();
  const remove = useDeleteSuccessionPlan();

  async function handleCreate() {
    if (!form.roleName || !form.successorId) {
      toast.error("Role name and successor are required");
      return;
    }
    try {
      await create.mutateAsync({
        roleName: form.roleName,
        successorId: form.successorId,
        incumbentId: form.incumbentId || null,
        readiness: form.readiness,
        note: form.note || null,
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
                    <p className="font-medium text-sm truncate">{plan.roleName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Successor: {plan.successorId.slice(0, 8)}…
                      {plan.incumbentId && <> · Incumbent: {plan.incumbentId.slice(0, 8)}…</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                      {cfg.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive hover:text-destructive"
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Succession Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Role / Position</Label>
              <Input
                value={form.roleName}
                onChange={(e) => setForm((p) => ({ ...p, roleName: e.target.value }))}
                placeholder="e.g. Head of Engineering"
              />
            </div>
            <div className="space-y-1">
              <Label>Successor ID</Label>
              <Input
                value={form.successorId}
                onChange={(e) => setForm((p) => ({ ...p, successorId: e.target.value }))}
                placeholder="User ID"
              />
            </div>
            <div className="space-y-1">
              <Label>Incumbent ID (optional)</Label>
              <Input
                value={form.incumbentId}
                onChange={(e) => setForm((p) => ({ ...p, incumbentId: e.target.value }))}
                placeholder="Current holder"
              />
            </div>
            <div className="space-y-1">
              <Label>Readiness</Label>
              <Select
                value={form.readiness}
                onValueChange={(v) => setForm((p) => ({ ...p, readiness: v as SuccessionReadiness }))}
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
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
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
