"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PageState } from "@/components/shared/page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { useDeleteWatermarkPolicy, useSignWatermarkPolicies, useUpdateWatermarkPolicy } from "@/hooks/api/sign/settings";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SignWatermarkPolicy } from "@/types/sign";
import { WatermarkPolicyDialog } from "./watermark-policy-dialog";
import { SettingsSurface } from "./settings-surface";

const SCOPE_LABEL: Record<string, string> = {
  tenant: "Organisation",
  envelope: "One envelope",
  template: "One template",
};

function scopeLabel(scopeType: string): string {
  return SCOPE_LABEL[scopeType] ?? scopeType.replaceAll("_", " ");
}

function policyTitle(policy: SignWatermarkPolicy): string {
  if (policy.text) return policy.text;
  if (policy.imageFileKey) return "Image watermark";
  return "Untitled watermark";
}

function PolicyRow({
  policy,
  onEnabledChange,
  onDelete,
}: {
  policy: SignWatermarkPolicy;
  onEnabledChange: (checked: boolean) => void;
  onDelete: () => void;
}) {
  const where = policy.showOnFinalPdf ? "Final PDF" : "Preview only";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="size-3 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: policy.color }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <TruncatedText text={policyTitle(policy)} className="text-sm font-medium" />
          <p className="mt-0.5 text-sm text-muted-foreground">
            {scopeLabel(policy.scopeType)}
            <span aria-hidden="true"> · </span>
            {where}
            <span aria-hidden="true"> · </span>
            <span className="tabular-nums">{policy.opacity}%</span> opacity
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Switch checked={policy.enabled} onCheckedChange={onEnabledChange} aria-label={`Enable ${policyTitle(policy)}`} />
        <AnimatedIconButton variant="ghost" size="icon" icon={Trash2Icon} className="size-8" aria-label="Delete watermark policy" onClick={onDelete} />
      </div>
    </div>
  );
}

export function WatermarkPoliciesPanel() {
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const policiesQuery = useSignWatermarkPolicies();
  const policies = policiesQuery.data;
  const panelState = usePageState({
    permission: "sign:admin:manage",
    isLoading: policiesQuery.isLoading,
    isError: policiesQuery.isError,
    error: policiesQuery.error,
    isEmpty: policies?.length === 0,
  });
  const update = useUpdateWatermarkPolicy();
  const del = useDeleteWatermarkPolicy();

  async function handleToggle(id: number, enabled: boolean) {
    try {
      await update.mutateAsync({ id, input: { enabled } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleEnabledChange(id: number) {
    return function changeEnabled(checked: boolean) {
      void handleToggle(id, checked);
    };
  }

  function handleCreateOpen() {
    setCreateOpen(true);
  }

  function handleRetry() {
    void policiesQuery.refetch();
  }

  function handleDeleteRequest(id: number) {
    return function requestDelete(): void {
      setPendingDeleteId(id);
    };
  }

  function handleDeleteDialogChange(open: boolean): void {
    if (!open) setPendingDeleteId(null);
  }

  async function handleDeleteConfirm(): Promise<void> {
    if (pendingDeleteId == null) return;
    try {
      await del.mutateAsync(pendingDeleteId);
      toast.success("Watermark policy deleted");
      setPendingDeleteId(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleDeleteConfirmClick(): void {
    void handleDeleteConfirm();
  }

  return (
    <>
      <SettingsSurface
        title="Watermarks"
        description="Stamped on previews, and on the finished PDF when a policy says so."
        className="h-full min-h-full flex-1"
        bodyClassName="min-h-80"
        action={
          <AnimatedIconButton size="sm" icon={PlusIcon} iconClassName="mr-1.5" onClick={handleCreateOpen}>
            New policy
          </AnimatedIconButton>
        }
      >
        <PageState
          resolution={panelState}
          className="h-full min-h-0 flex-1"
          loading={
            <div className="divide-y divide-border">
              <Skeleton className="h-16 w-full rounded-none" />
              <Skeleton className="h-16 w-full rounded-none" />
            </div>
          }
          onRetry={handleRetry}
          empty={
            <EmptyState
              title="No watermark policies"
              description="Add a policy to stamp a watermark on previews or the final PDF."
              className="h-full min-h-full flex-1 rounded-none border-0 bg-transparent"
            />
          }
        >
          <div className="divide-y divide-border">
            {policies?.map((policy) => (
              <PolicyRow
                key={policy.id}
                policy={policy}
                onEnabledChange={handleEnabledChange(policy.id)}
                onDelete={handleDeleteRequest(policy.id)}
              />
            ))}
          </div>
        </PageState>
      </SettingsSurface>
      <WatermarkPolicyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this watermark policy?"
        description="Envelopes that already used it keep their stamped copy. New envelopes will not."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirmClick}
        isPending={del.isPending}
      />
    </>
  );
}
