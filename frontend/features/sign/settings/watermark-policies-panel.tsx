"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Switch } from "@/components/ui/switch";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeleteWatermarkPolicy, useSignWatermarkPolicies, useUpdateWatermarkPolicy } from "@/hooks/api/sign/settings";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WatermarkPolicyDialog } from "./watermark-policy-dialog";

export function WatermarkPoliciesPanel() {
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const { data: policies } = useSignWatermarkPolicies();
  const update = useUpdateWatermarkPolicy();
  const del = useDeleteWatermarkPolicy();

  async function handleToggle(id: number, enabled: boolean) {
    try {
      await update.mutateAsync({ id, input: { enabled } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Watermark policies</CardTitle>
        <AnimatedIconButton size="sm" icon={PlusIcon} iconClassName="mr-1.5" onClick={() => setCreateOpen(true)}>
          New policy
        </AnimatedIconButton>
      </CardHeader>
      <CardContent className="space-y-2">
        {!policies || policies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No watermark policies configured.</p>
        ) : (
          policies.map((policy) => (
            <div key={policy.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <TruncatedText text={policy.text ?? "Untitled watermark"} className="text-sm font-medium" />
                <TruncatedText
                  text={`Scope: ${policy.scopeType} ${policy.showOnFinalPdf ? "· on final PDF" : "· preview only"}`}
                  className="text-xs text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={policy.enabled} onCheckedChange={(v) => handleToggle(policy.id, v)} />
                <AnimatedIconButton variant="ghost" size="icon" icon={Trash2Icon} className="size-8" aria-label="Delete watermark policy" onClick={handleDeleteRequest(policy.id)} />
              </div>
            </div>
          ))
        )}
      </CardContent>
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
    </Card>
  );
}
