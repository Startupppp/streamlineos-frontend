"use client";

import { useState, useMemo, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
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
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { LoadingState } from "@/components/shared/loading-state";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";
import { TruncatedText } from "@/components/ui/truncated-text";
import { successionFormSchema } from "./succession-schema";
import { zodFieldErrors } from "./zod-field-errors";

const READINESS_CONFIG: Record<SuccessionReadiness, { label: string; className: string }> = {
  ready_now: { label: "Ready Now", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  "1_2_years": { label: "1–2 Years", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
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

function isSuccessionReadiness(value: string): value is SuccessionReadiness {
  return value === "ready_now" || value === "1_2_years" || value === "3_plus";
}

export function SuccessionTab() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [removeId, setRemoveId] = useState<number | null>(null);
  const canManage = useCan("hr:succession:manage");

  function applyFieldEdit<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleDialogOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setForm(DEFAULT_FORM);
      setFieldErrors({});
    }
  }

  function handleRoleNameChange(event: ChangeEvent<HTMLInputElement>) {
    applyFieldEdit("roleName", event.target.value);
  }

  function handleSuccessorChange(userId: string | null) {
    applyFieldEdit("successorId", userId ?? "");
  }

  function handleIncumbentChange(userId: string | null) {
    applyFieldEdit("incumbentId", userId ?? "");
  }

  function handleReadinessChange(value: string) {
    if (isSuccessionReadiness(value)) setForm((current) => ({ ...current, readiness: value }));
  }

  function handleNoteChange(event: ChangeEvent<HTMLInputElement>) {
    applyFieldEdit("note", event.target.value);
  }

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useSuccessionPlans();
  const plans = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const { data: membersData } = useOrgMembers(1, 200);
  const create = useCreateSuccessionPlan();
  const remove = useDeleteSuccessionPlan();
  const pageState = usePageState({
    permission: "hr:succession:view",
    isLoading,
    isError,
    error,
    isEmpty: plans.length === 0,
  });

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

  async function handleConfirmRemove() {
    if (removeId === null) return;
    try {
      await remove.mutateAsync(removeId);
      toast.success("Succession plan removed");
      setRemoveId(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleRemoveOpenChange(next: boolean) {
    if (!next) setRemoveId(null);
  }

  function handleOpenCreate() {
    setOpen(true);
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <PageState
      resolution={pageState}
      onRetry={handleRetry}
      className="flex-1"
      loading={<LoadingState variant="list" rows={8} />}
      empty={
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-full w-full" />}
          title="No succession plans yet"
          description="Map successors to key roles to ensure leadership continuity."
          action={canManage ? { label: "Add Plan", onClick: handleOpenCreate } : undefined}
        />
      }
    >
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-sm text-muted-foreground">
          {plans.length} succession plan{plans.length !== 1 ? "s" : ""}
        </p>
        {canManage && (
          <Button size="sm" onClick={handleOpenCreate}>
            Add Plan
          </Button>
        )}
      </div>

        <div className="space-y-2">
          {plans.map((plan) => {
            const readiness = plan.readiness && isSuccessionReadiness(plan.readiness) ? plan.readiness : "ready_now";
            const cfg = READINESS_CONFIG[readiness];
            return (
              <Card key={plan.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <TruncatedText text={plan.positionTitle ?? "—"} className="font-medium text-sm" />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Successor: {resolveMemberName(plan.successorUserId) ?? plan.successorUserId ?? "—"}
                      {plan.incumbentUserId && (
                        <> · Incumbent: {resolveMemberName(plan.incumbentUserId) ?? plan.incumbentUserId}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                      {cfg.label}
                    </Badge>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoveId(plan.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <InfiniteScrollSentinel
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
            label="Load more succession entries"
          />
        </div>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>New Succession Plan</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 px-6 py-4">
            <div className="space-y-1">
              <Label>Role / Position</Label>
              <Input
                value={form.roleName}
                onChange={handleRoleNameChange}
                placeholder="e.g. Head of Engineering"
              />
              {fieldErrors.roleName && <p className="text-xs text-destructive">{fieldErrors.roleName}</p>}
            </div>
            <div className="space-y-1">
              <Label>Successor</Label>
              <MemberPicker
                mode="single"
                value={form.successorId || undefined}
                onChange={handleSuccessorChange}
                placeholder="Select successor"
              />
              {fieldErrors.successorId && <p className="text-xs text-destructive">{fieldErrors.successorId}</p>}
            </div>
            <div className="space-y-1">
              <Label>Incumbent (optional)</Label>
              <MemberPicker
                mode="single"
                value={form.incumbentId || undefined}
                onChange={handleIncumbentChange}
                allowUnassigned
                placeholder="Current holder"
              />
              {fieldErrors.incumbentId && <p className="text-xs text-destructive">{fieldErrors.incumbentId}</p>}
            </div>
            <div className="space-y-1">
              <Label>Readiness</Label>
              <Select
                value={form.readiness}
                onValueChange={handleReadinessChange}
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
                onChange={handleNoteChange}
              />
              {fieldErrors.note && <p className="text-xs text-destructive">{fieldErrors.note}</p>}
            </div>
          </DialogBody>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              isPending={create.isPending}
              onClick={handleCreate}
            >
              Create
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmSheet
        open={removeId !== null}
        onOpenChange={handleRemoveOpenChange}
        title="Remove succession plan"
        description="This removes the successor mapping for this role."
        confirmLabel="Remove"
        destructive
        onConfirm={handleConfirmRemove}
        isPending={remove.isPending}
      />
    </div>
    </PageState>
  );
}
